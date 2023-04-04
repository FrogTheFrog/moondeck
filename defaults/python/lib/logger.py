import logging
from logging.handlers import RotatingFileHandler

def set_log_filename(filename):
    logging.basicConfig(handlers=[RotatingFileHandler(filename=filename, maxBytes=1024000, backupCount=2)],
                        level=logging.INFO,
                        format='%(asctime)s %(levelname)s %(message)s',
                        force=True)

logger = logging.getLogger()
