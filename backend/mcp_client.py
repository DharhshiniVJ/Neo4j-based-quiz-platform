import os
import json
from dotenv import load_dotenv
from mcp.client.sse import sse_client
from mcp.client.session import ClientSession
from cerebras.cloud.sdk import AsyncCerebras, RateLimitError
import asyncio
from contextlib import AsyncExitStack

load_dotenv()

MAX_TOOL_ROUNDS = 5

class MCPConnectionManager:
    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.session = None
        self.schema_text = ""

    async def start(self):
        print("[MCPConnectionManager] Starting persistent connection...")
        sse_url = "http://127.0.0.1:8000/mcp/sse"
        for _ in range(10):
            try:
                read, write = await self.exit_stack.enter_async_context(sse_client(sse_url))
                self.session = await self.exit_stack.enter_async_context(ClientSession(read, write))
                await self.session.initialize()
                
                try:
                    schema_resource = await self.session.read_resource("db://schema")
                    self.schema_text = schema_resource.contents[0].text if schema_resource.contents else ""
                except Exception as e:
                    print(f"[MCPConnectionManager] Failed to read schema: {e}")
                    self.schema_text = ""
                
                print("[MCPConnectionManager] Persistent connection established.")
                return
            except Exception as e:
                print(f"[MCPConnectionManager] Connection failed, retrying in 1s: {e}")
                await asyncio.sleep(1)
                
    async def close(self):
        await self.exit_stack.aclose()
        print("[MCPConnectionManager] Connection closed.")

mcp_manager = MCPConnectionManager()

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

    if not mcp_manager.session:
        return "System error: MCP connection not established."

    # 1. Dynamically fetch tools to guarantee CI/CD compliance
    try:
        tools_response = await mcp_manager.session.list_tools()
        all_tools = tools_response.tools
    except Exception as e:
        print(f"[mcp_client] Error fetching tools: {e}")
        all_tools = []

    available_tools = []
    cerebras_tools = []

    for tool in all_tools:
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

    tool_descriptions = "\n".join([f"- {t.name}: {t.description}" for t in available_tools])

    # 2. Parse Slash Commands to MCP Prompts
    command = "default_assistant"
    user_query = prompt
    args_dict = {"role": role, "user_id": user_id}

    if prompt.startswith("/"):
        parts = prompt[1:].split(" ", 1)
        command = parts[0]
        user_query = parts[1] if len(parts) > 1 else ""
        if command in ["draft_quiz", "analyze_student"]:
            args_dict = {"teacher_id": user_id, "user_query": user_query}
        elif command == "explain":
            args_dict = {"student_id": user_id, "user_query": user_query}

    # 3. Fetch the Prompt from the MCP Server
    try:
        prompt_response = await mcp_manager.session.get_prompt(command, arguments=args_dict)
        # The prompt_response returns messages. We will use the first message text as our system prompt.
        prompt_text = prompt_response.messages[0].content.text if prompt_response.messages else ""
    except Exception as e:
        print(f"[mcp_client] Error fetching prompt '{command}': {e}")
        prompt_text = f"You are a helpful {role} assistant. Answer the user's question: {prompt}"

    system_content = (
        f"{prompt_text}\n\n"
        f"Database schema:\n{mcp_manager.schema_text}\n\n"
        f"Available tools:\n{tool_descriptions}\n"
    )

    trimmed_history = history[-10:]

    messages = [
        {"role": "system", "content": system_content},
        *trimmed_history,
        {"role": "user", "content": prompt},
    ]
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
                tool_result = await mcp_manager.session.call_tool(func_name, arguments=args)
                result_text = tool_result.content[0].text if tool_result.content else "Success"
            except Exception as e:
                result_text = f"Error executing tool '{func_name}': {str(e)}"

            print(f"[mcp_client]   <- {func_name} result: {result_text[:100]}...")

            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": result_text
            })

    print(f"[mcp_client] hit MAX_TOOL_ROUNDS={MAX_TOOL_ROUNDS}, forcing final summary")
    final_response = await _call_with_retry(
        client,
        messages,
    )
    return final_response.choices[0].message.content or ""
