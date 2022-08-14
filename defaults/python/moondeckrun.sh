# Script wrapper is needed so that the steam can focus the Moonlight window...
# Does not work by calling the python script directly :/

CURRENT_DIR=`dirname "$(readlink -f "$0")"`
cd "$CURRENT_DIR";

exec /usr/bin/python ./runner.py
