import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse # <--- Import this
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from smolagents import ToolCallingAgent, ToolCollection, OpenAIServerModel
from mcp import StdioServerParameters

app = FastAPI(title="MCP Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    prompt: str

@app.post("/chat")
async def chat_endpoint(request: QueryRequest):
    """
    Streams the agent's execution steps (thoughts, tool calls) and final answer.
    """
    
    # 1. Setup the Generator Function
    def stream_generator():
        try:
            # --- Setup Model & Servers ---
            model = OpenAIServerModel(
                model_id="gpt-4o",
                api_key=os.environ.get("OPENAI_API_KEY")
            )
            
            stock_server = StdioServerParameters(command="uv", args=["run", "server_stocks.py"], env=None)
            ta_server = StdioServerParameters(command="uv", args=["run", "ta_mcp.py"], env=None)

            # --- Connect & Run ---
            with ToolCollection.from_mcp(stock_server, trust_remote_code=True) as stock_tools, \
                 ToolCollection.from_mcp(ta_server, trust_remote_code=True) as ta_tools:
                
                all_tools = [*stock_tools.tools, *ta_tools.tools]
                agent = ToolCallingAgent(tools=all_tools, model=model)
                
                # --- STREAMING EXECUTION ---
                # We use stream=True which yields 'ActionStep' objects
                for step in agent.run(request.prompt, stream=True):
                    
                    # 1. Send 'Thought' (Reasoning)
                    # Note: different agent versions store thoughts in different attributes. 
                    # We try 'model_output' (raw LLM output) first.
                    thought = getattr(step, "model_output", "")
                    if thought:
                        yield json.dumps({"type": "thought", "content": str(thought)}) + "\n"

                    # 2. Send 'Tool Call' details
                    if hasattr(step, "tool_calls") and step.tool_calls:
                        for call in step.tool_calls:
                            yield json.dumps({
                                "type": "tool_call",
                                "tool": call.name,
                                "args": call.arguments
                            }) + "\n"
                            
                    # 3. Send 'Tool Output' (Observation)
                    # Often stored in 'observations' or 'tool_outputs'
                    if hasattr(step, "observations") and step.observations:
                        yield json.dumps({
                            "type": "observation",
                            "content": str(step.observations)
                        }) + "\n"

                # --- FINAL ANSWER ---
                # The final answer is usually the last step's output or a specific attribute
                # In streaming mode, the loop finishes when done. We can send a final marker.
                yield json.dumps({"type": "final", "content": "Done"}) + "\n"

        except Exception as e:
            yield json.dumps({"type": "error", "content": str(e)}) + "\n"

    # 2. Return the StreamingResponse
    return StreamingResponse(stream_generator(), media_type="application/x-ndjson")