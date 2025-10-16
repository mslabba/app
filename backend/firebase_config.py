import firebase_admin
from firebase_admin import credentials, firestore, auth
import os
from pathlib import Path

# Initialize Firebase Admin SDK
ROOT_DIR = Path(__file__).parent

# Check if Firebase credentials are provided via environment variable or file
cred_path = os.environ.get('FIREBASE_CREDENTIALS_PATH', str(ROOT_DIR / 'firebase-admin.json'))

try:
    if os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
    else:
        # If no file exists, try to use environment variable with JSON content
        firebase_creds = os.environ.get('FIREBASE_CREDENTIALS_JSON')
        if firebase_creds:
            import json
            cred_dict = json.loads(firebase_creds)
            cred = credentials.Certificate(cred_dict)
        else:
            # Use default application credentials (for testing)
            print("Warning: No Firebase credentials found. Using default credentials for development.")
            # For now, we'll initialize without credentials for structure setup
            cred = None
    
    if cred:
        firebase_admin.initialize_app(cred)
    else:
        # Initialize with minimal config for development
        firebase_admin.initialize_app()
except Exception as e:
    print(f"Firebase initialization error: {e}")
    print("App will continue with limited functionality. Please provide valid Firebase credentials.")

# Get Firestore client
try:
    db = firestore.client()
except Exception as e:
    print(f"Firestore client error: {e}")
    db = None

# Firebase Auth
firebase_auth = auth
