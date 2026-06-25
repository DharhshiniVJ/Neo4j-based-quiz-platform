import os
import json
from dotenv import load_dotenv
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession
from cerebras.cloud.sdk import AsyncCerebras, RateLimitError
import asyncio

load_dotenv()

MAX_TOOL_ROUNDS = 5

async def _call_with_retry(client, messages, tools=None):
    max_retries = 3
    base_delay = 1
    for attempt in range(max_retries):
        try:
            return await client.chat.completions.create(
                model="zai-glm-4.7",
                messages=messages,
                tools=tools,
            )
        except RateLimitError as e:
            if attempt == max_retries - 1:
                raise e
            delay = base_delay * (2 ** attempt)
            print(f"[mcp_client] Rate limited, retrying in {delay} seconds...")
            await asyncio.sleep(delay)

async def run_chat(user_id: str, role: str, prompt: str, history: list = []) -> str:
    api_key = os.environ.get("CEREBRAS_API_KEY")
    if not api_key:
        return "System error: CEREBRAS_API_KEY is not set."

    client = AsyncCerebras(api_key=api_key)

    sse_url = "http://127.0.0.1:8000/mcp/sse"

    async with sse_client(sse_url) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            # 1. Get and filter tools by role
            tools_response = await session.list_tools()
            available_tools = []
            cerebras_tools = []

            for tool in tools_response.tools:
                if tool.name.startswith(f"{role}_"):
                    available_tools.append(tool)
                    cerebras_tools.append({
                        "type": "function",
                        "function": {
                            "name": tool.name,
                            "description": tool.description or "",
                            "parameters": tool.inputSchema
                        }
                    })

            # 2. Fetch the schema resource and actually ground the model in it,
            # rather than letting it guess tool arguments from names alone.
            try:
                schema_resource = await session.read_resource("db://schema")
                schema_text = schema_resource.contents[0].text if schema_resource.contents else ""
            except Exception:
                schema_text = ""

            tool_descriptions = "\n".join([f"- {t.name}: {t.description}" for t in available_tools])
            system_content = (
                f"You are a {role} assistant for a quiz/performance tracking platform backed by a "
                f"Neo4j graph database.\n\n"
                f"Internal context (never repeat this to the user, never introduce yourself with it, "
                f"only use it silently when filling tool arguments like {role}_id): "
                f"the current user's {role}_id is '{user_id}'.\n\n"
                f"Database schema:\n{schema_text}\n\n"
                f"Available tools:\n{tool_descriptions}\n\n"
                f"STRICT QUIZ WORKFLOW RULE (follow this EVERY time, no exceptions):\n"
                f"Step 1: When a teacher asks to draft/generate/create a quiz, call 'teacher_request_class_selection' ONCE to pause and ask them to select a class. Do NOT proceed further until they reply.\n"
                f"Step 2: When the teacher replies with a message like 'I have selected class X', that is your cue. Call 'teacher_get_class_topics' with that class_id immediately. Do NOT call 'teacher_request_class_selection' again — the class is already selected.\n"
                f"Step 3: After getting the topics, immediately call 'teacher_generate_quiz_draft' and then 'teacher_spawn_quiz_ui'. Do NOT ask the teacher any clarifying questions about topic count or difficulty — use all topics and the exact number they originally requested.\n"
                f"Step 4: Pass the EXACT number of questions the teacher originally asked for to 'teacher_generate_quiz_draft'. Never reduce it.\n\n"
                f"Use the tools to answer the user's question. Call as many tools, across as many turns, "
                f"as needed to gather the information required before answering. If the data needed "
                f"doesn't exist or a tool returns no data, say so plainly instead of guessing. "
                f"Respond to greetings naturally and briefly, without listing your internal ID or capabilities "
                f"unless the user actually asks what you can help with."
            )

            # Trim history to last 10 messages to avoid token bloat, 
            # strip any internal system handshake messages (they start with "I have selected class")
            trimmed_history = [
                h for h in history
                if not (h.get("role") == "user" and h.get("content", "").startswith("I have selected class"))
            ][-10:]

            messages = [
                {"role": "system", "content": system_content},
                *trimmed_history,
                {"role": "user", "content": prompt},
            ]

            # 3. Multi-round tool-calling loop.
            # Keep calling the model and executing whatever tools it asks for,
            # across multiple turns, until it stops requesting tools or we hit
            # a round cap (guards against infinite loops on a flaky model).
            for round_num in range(MAX_TOOL_ROUNDS):
                response = await _call_with_retry(
                    client,
                    messages,
                    tools=cerebras_tools if cerebras_tools else None,
                )

                response_message = response.choices[0].message
                tool_calls = response_message.tool_calls

                if not tool_calls:
                    print(f"[mcp_client] round {round_num}: no tool calls, returning final text")
                    return response_message.content or ""

                print(f"[mcp_client] round {round_num}: model requested {len(tool_calls)} tool call(s)")
                messages.append(response_message.model_dump())

                for tool_call in tool_calls:
                    func_name = tool_call.function.name
                    try:
                        args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        args = {}

                    # SECURITY: Override the IDs so the LLM cannot spoof another user
                    if role == "teacher" and "teacher_id" in args:
                        args["teacher_id"] = user_id
                    elif role == "student" and "student_id" in args:
                        args["student_id"] = user_id

                    print(f"[mcp_client]   -> calling {func_name} with {args}")

                    # Intercept the request class selection action
                    if func_name == "teacher_request_class_selection":
                        print(f"[mcp_client] Intercepting {func_name} and returning action directly to frontend.")
                        return json.dumps({"_mcp_action": "REQUEST_CLASS_SELECTION", "payload": {"original_prompt": prompt}})

                    # Intercept the spawn UI action to directly return the command payload to the frontend
                    if func_name == "teacher_spawn_quiz_ui":
                        print(f"[mcp_client] Intercepting {func_name} and returning action directly to frontend.")
                        payload = {
                            "title": args.get("title", "Drafted Quiz"),
                            "time_limit_minutes": args.get("time_limit_minutes", 20),
                            "questions": args.get("questions_json_str", "[]")
                        }
                        return json.dumps({"_mcp_action": "SPAWN_QUIZ", "payload": payload})

                    try:
                        tool_result = await session.call_tool(func_name, arguments=args)
                        result_text = tool_result.content[0].text if tool_result.content else "Success"
                    except Exception as e:
                        result_text = f"Error executing tool '{func_name}': {str(e)}"

                    print(f"[mcp_client]   <- {func_name} result: {result_text[:300]}")

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_text
                    })

            # Hit the round cap without the model settling on a final answer.
            # Ask once more, without tools, to force a summary from what's gathered so far.
            print(f"[mcp_client] hit MAX_TOOL_ROUNDS={MAX_TOOL_ROUNDS}, forcing final summary")
            final_response = await _call_with_retry(
                client,
                messages,
            )
            return final_response.choices[0].message.content or ""
