import logging
from logging.handlers import RotatingFileHandler

def set_log_filename(filename, rotate):
    logging.basicConfig(handlers=[RotatingFileHandler(
                                    filename=filename, 
                                    mode='a' if rotate else 'w',
                                    maxBytes=1024000 if rotate else 0,
                                    backupCount=2 if rotate else 0)
                                    ],
                        level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s',
                        force=True)
    
def enable_debug_level():
    logging.getLogger().setLevel(logging.DEBUG)

logger = logging.getLogger()
