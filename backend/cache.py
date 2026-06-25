import json
import time
import functools
import hashlib
import threading
try:
    import redis
    # Try connecting to Redis, fallback to L1 only if not available
    r = redis.Redis(host='localhost', port=6379, db=0, socket_connect_timeout=1)
    r.ping()
    REDIS_ENABLED = True
except Exception:
    REDIS_ENABLED = False

# L1 In-Memory Cache
L1_CACHE = {}
L1_LOCK = threading.Lock()

def get_cache_key(func_name, *args, **kwargs):
    # Create a stable string representation of arguments
    key_str = f"{func_name}:args:{args}:kwargs:{sorted(kwargs.items())}"
    return hashlib.md5(key_str.encode('utf-8')).hexdigest()

def cached(ttl_seconds=300):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = get_cache_key(func.__name__, *args, **kwargs)
            now = time.time()
            
            # 1. Check L1 Cache
            with L1_LOCK:
                if key in L1_CACHE:
                    cached_data, timestamp = L1_CACHE[key]
                    if now - timestamp < ttl_seconds:
                        return cached_data
                    else:
                        del L1_CACHE[key]
                        
            # 2. Check L2 Cache (Redis)
            if REDIS_ENABLED:
                try:
                    l2_data = r.get(key)
                    if l2_data:
                        decoded_data = l2_data.decode('utf-8')
                        # Repopulate L1
                        with L1_LOCK:
                            L1_CACHE[key] = (decoded_data, now)
                        return decoded_data
                except Exception:
                    pass # Redis error, just proceed
                    
            # 3. Execute Function
            result = func(*args, **kwargs)
            
            # 4. Save to Caches
            with L1_LOCK:
                L1_CACHE[key] = (result, now)
                
            if REDIS_ENABLED:
                try:
                    r.setex(key, ttl_seconds, result)
                except Exception:
                    pass
                    
            return result
        return wrapper
    return decorator
