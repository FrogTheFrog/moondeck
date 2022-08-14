import logging

def set_log_filename(filename):
    logging.basicConfig(filename=filename,
                        format='%(asctime)s %(levelname)s %(message)s',
                        filemode='w',
                        force=True)

logger = logging.getLogger()
logger.setLevel(logging.INFO)
