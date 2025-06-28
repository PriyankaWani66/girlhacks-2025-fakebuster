# Fake Buster API

A FastAPI application for detecting fake images and AI-generated text.

## Features

- **Image Detection**: Uses Sightengine API to detect deepfake images
- **Text Detection**: Uses AI Detector to classify text as AI-generated or human-written

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd api-fake
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your actual API credentials:
   ```
   SIGHTENGINE_API_USER=your_actual_api_user
   SIGHTENGINE_API_SECRET=your_actual_api_secret
   ```

4. **Run the application**
   ```bash
   uvicorn main:app --reload
   ```

## API Endpoints

- `GET /`: Health check endpoint
- `POST /detect-image`: Detect if an image is fake/deepfake
- `POST /detect-text`: Detect if text is AI-generated

## Security Notes

- API keys are stored in environment variables and are not committed to the repository
- The `.env` file is ignored by git to prevent accidental exposure of credentials
- Always use the `.env.example` file as a template for setting up your environment

## Environment Variables

- `SIGHTENGINE_API_USER`: Your Sightengine API user ID
- `SIGHTENGINE_API_SECRET`: Your Sightengine API secret key 