#!/usr/bin/env bash

###############################################################################
# Mongo Script Executor
#
# This script allows direct execution of javascript files in mongo. Assuming
# this script is in the same directory as the javascript file, place the
# following at the top of the file:
#
# #!/usr/bin/env bash
# // 2>/dev/null;$(dirname $0)/mongoExec.sh $0 "$@"; exit
#
# When executed, the script will be run in the mongo environment, using the
# database specified by MONGO_DB in this script, unless overridden by passing
# the --db host/dbName parameter.
#
###############################################################################

MONGO_DB=localhost/lrng

SCRIPTFILE=/tmp/mongoscript.js
#SCRIPTFILE=$(mktemp /tmp/mongoscript.js.XXXXXX)
INPUTFILE=$1

# Shift out the filename
shift

# Check for a --db parameter
if [ "x$1" == "x--db" ]; then
    # Shift out the --db
    shift

    # Read the database name
    MONGO_DB=$1

    # Shift it out
    shift
fi

# Write out the arguments to an array that the javascript can read
echo "var PROGNAME=\"$INPUTFILE\"; var ARGS = [];" >> $SCRIPTFILE
for p in "$@";
do
    echo "ARGS.push('"$p"');" >> $SCRIPTFILE
done;

# Output the script excluding the first 2 lines, which contain the execution harness
awk 'FNR>2' $INPUTFILE >> $SCRIPTFILE

# Print a pretty statement about what we're doing to stderr (so it doesn't interfere with processing the results)
#echo -e '\033[1m'Executing '\033[36m'$INPUTFILE'\033[0;1m' on '\033[33m'$MONGO_DB'\033[0m' >&2

#echo >&2

# Run the script, excluding the first two lines, which just print out the mongo version
# and what database we're connecting to (which we've already announced)
mongo $MONGO_DB $SCRIPTFILE | awk 'FNR>2' | awk '{if (NR>3) {print}}'

# Remove the script file
rm $SCRIPTFILE