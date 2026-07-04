import os 

def getenv_with_default(key: str, default_val = None):
    env_val = os.getenv(key)
    if env_val:
        return env_val
    
    if default_val == None:
        raise ReferenceError(f"'{key}' is not set in environment variable")
    
    return default_val