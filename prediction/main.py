# main.py
from fastapi import FastAPI, Body
from gradio_client import Client
import requests
import json
import re
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

@app.get("/")
async def read_root():
    return {"message": "Hello from FastAPI for Fake Buster team!"}
from fastapi.responses import FileResponse

@app.get("/favicon.ico")
async def favicon():
    return FileResponse("path/to/favicon.ico")  

@app.post("/detect-image")
async def detect_image(image_url: str = Body(..., embed=True)):
    params = {
        'url': image_url,
        'models': 'deepfake',
        'api_user': os.getenv('SIGHTENGINE_API_USER'),
        'api_secret': os.getenv('SIGHTENGINE_API_SECRET')
    }

    r = requests.get('https://api.sightengine.com/1.0/check.json', params=params)
    output = r.json()
    return output.get("type", "unknown")

@app.post("/detect-text")
async def detect_text(text_str: str = Body(..., embed=True)):
    client = Client("SzegedAI/AI_Detector")
    result = client.predict(text=text_str, api_name="/classify_text")
    clean_text = re.sub(r"<.*?>", "", result)
    clean_text = re.sub(r"\*\*", "", clean_text)
    clean_text = clean_text.strip()
    
    llm_match = re.search(r'Identified LLM:\s*(.+)', clean_text)
    if llm_match:
        llm_result = llm_match.group(1).strip()
        pred = re.sub(r'\n\nIdentified LLM:.*', '', clean_text).strip()
    else:
        pred = clean_text
        llm_result = "No LLM analysis found"
    
    return {"result": pred, "LLM": llm_result}
