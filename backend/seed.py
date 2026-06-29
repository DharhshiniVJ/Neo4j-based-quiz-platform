"""
seed.py — Full database seed script for StudyDB.

Runs all cypher files in order, then sets bcrypt password hashes for all users.

Usage:
    python seed.py

Make sure the Neo4j instance is running before executing.
Default password set for all users: studydb123
"""

import os
import sys
import time
import bcrypt
from neo4j import GraphDatabase
from dotenv import load_dotenv

# ─── Load environment ─────────────────────────────────────────────────────────
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

NEO4J_URI      = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

DEFAULT_PASSWORD = "studydb123"

# ─── Connection (with retry for Docker startup lag) ───────────────────────────
def get_driver(retries=10, delay=8):
    for attempt in range(1, retries + 1):
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
            driver.verify_connectivity()
            print(f"[OK] Connected to Neo4j at {NEO4J_URI}")
            return driver
        except Exception as e:
            print(f"[{attempt}/{retries}] Neo4j not ready yet, retrying in {delay}s... ({e})")
            time.sleep(delay)
    print("[ERROR] Could not connect to Neo4j. Exiting.")
    sys.exit(1)

# ─── Cypher file runner ───────────────────────────────────────────────────────
CYPHER_DIR = os.path.join(os.path.dirname(__file__), '..', 'cypher')

CYPHER_FILES = [
    "01_constraints.cypher",
    "02_subjects_topics.cypher",
    "03_teachers_students_classes.cypher",
    "04a_science_quiz_1.cypher",
    "04b_science_quiz_2.cypher",
    "04c_math_quiz_1.cypher",
    "04d_math_quiz_2.cypher",
    "05_sample_attempt.cypher",
    "06_backfill_expected_time.cypher",
    "07_post_quizzes_to_classes.cypher",
    "08_backfill_behavior.cypher",
]

def run_cypher_file(session, filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split on semicolons, strip comments and blanks, run each statement
    statements = [s.strip() for s in content.split(';')]
    count = 0
    for stmt in statements:
        # Remove comment lines and skip blank statements
        lines = [l for l in stmt.splitlines() if not l.strip().startswith('//')]
        clean = '\n'.join(lines).strip()
        if clean:
            session.run(clean)
            count += 1
    return count

def seed_cypher(driver):
    print("\n-- Seeding Cypher files -----------------------------------------")
    with driver.session(database=NEO4J_DATABASE) as session:
        for filename in CYPHER_FILES:
            filepath = os.path.join(CYPHER_DIR, filename)
            if not os.path.exists(filepath):
                print(f"  [SKIP] {filename} not found, skipping.")
                continue
            try:
                n = run_cypher_file(session, filepath)
                print(f"  [OK]   {filename}  ({n} statements)")
            except Exception as e:
                print(f"  [ERR]  {filename}: {e}")

# ─── Password seeder ─────────────────────────────────────────────────────────
def seed_passwords(driver):
    print("\n-- Setting password hashes --------------------------------------")
    salt   = bcrypt.gensalt()
    hashed = bcrypt.hashpw(DEFAULT_PASSWORD.encode(), salt).decode('utf-8')

    with driver.session(database=NEO4J_DATABASE) as session:
        r1 = session.run(
            "MATCH (s:Student) SET s.password_hash = $h RETURN count(s) AS n",
            h=hashed
        )
        print(f"  Students updated: {r1.single()['n']}")

        r2 = session.run(
            "MATCH (t:Teacher) SET t.password_hash = $h RETURN count(t) AS n",
            h=hashed
        )
        print(f"  Teachers updated: {r2.single()['n']}")

    print(f"  Default password for all users: {DEFAULT_PASSWORD}")

# ─── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    driver = get_driver()
    seed_cypher(driver)
    seed_passwords(driver)
    driver.close()
    print("\n[DONE] Database seeded successfully!\n")
