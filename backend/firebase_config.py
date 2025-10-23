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
        print(f"✅ Loading Firebase credentials from file: {cred_path}")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # If no file exists, try to use environment variable with JSON content
        # Try both FIREBASE_CREDENTIALS and FIREBASE_CREDENTIALS_JSON for compatibility
        firebase_creds = os.environ.get('FIREBASE_CREDENTIALS') or os.environ.get('FIREBASE_CREDENTIALS_JSON')
        if firebase_creds:
            import json
            print("✅ Loading Firebase credentials from environment variable")
            cred_dict = json.loads(firebase_creds)
            
            # Ensure project_id is present
            if 'project_id' not in cred_dict:
                print("⚠️ Warning: project_id not found in credentials, trying FIREBASE_PROJECT_ID env var")
                project_id = os.environ.get('FIREBASE_PROJECT_ID')
                if project_id:
                    cred_dict['project_id'] = project_id
                    print(f"✅ Using project_id from environment: {project_id}")
            
            cred = credentials.Certificate(cred_dict)
            
            # Initialize with explicit project_id if available
            options = {}
            if 'project_id' in cred_dict:
                options['projectId'] = cred_dict['project_id']
                print(f"✅ Initializing Firebase with project_id: {cred_dict['project_id']}")
            
            firebase_admin.initialize_app(cred, options=options if options else None)
            print("✅ Firebase Admin SDK initialized successfully")
        else:
            # Use default application credentials (for testing)
            print("⚠️ Warning: No Firebase credentials found. Using default credentials for development.")
            # For now, we'll initialize without credentials for structure setup
            cred = None
            firebase_admin.initialize_app()
except Exception as e:
    print(f"❌ Firebase initialization error: {e}")
    print("App will continue with limited functionality. Please provide valid Firebase credentials.")

# Get Firestore client
try:
    db = firestore.client()
except Exception as e:
    print(f"Firestore client error: {e}")
    db = None

# Firebase Auth
firebase_auth = auth
