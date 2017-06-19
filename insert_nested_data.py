#!/usr/bin/python
import fileinput
import databaseconfig as cfg

print "Using PyGreSQL..."
import pgdb
conn = pgdb.connect( host=cfg.hostname, user=cfg.username, password=cfg.password, database=cfg.database )
cur = conn.cursor()

cur.execute("DROP TABLE IF EXISTS submissions;")
cur.execute("DROP TABLE IF EXISTS submission_xps;")
cur.execute("DROP TABLE IF EXISTS playlist_xps;")
cur.execute("DROP TABLE IF EXISTS interests;")
cur.execute("DROP TABLE IF EXISTS xp_resources;")
cur.execute("DROP TABLE IF EXISTS user_invites;")

cur.execute("""CREATE TABLE submissions (
    id text PRIMARY KEY,
    user_id text,
    playlist_id text,
    review text,
    reviewer_id text,
    review_date bigint,
    claimed boolean,
    ready_for_submit_date bigint,
    submit_date bigint,
    status text
)""")

cur.execute("""CREATE TABLE submission_xps (
    id text PRIMARY KEY,
    submission_id text,
    xp_id text,
    xp_type text,
    artifact_id text,
    posted_date bigint,
    status text
)""")

cur.execute("""CREATE TABLE playlist_xps (
    id text PRIMARY KEY,
    playlist_id text,
    xp_id text,
    required boolean
)""")

cur.execute("""CREATE TABLE interests (
    id text PRIMARY KEY,
    playlist_id text,
    interest text
)""")

cur.execute("""CREATE TABLE xp_resources (
    id text PRIMARY KEY,
    xp_id text,
    resource_id text
)""")

cur.execute("""CREATE TABLE user_invites (
    id text PRIMARY KEY,
    org_id text,
    invitation_date bigint,
    code_expiration_date bigint,
    email text,
    role text,
    admin_first_name text,
    admin_last_name text
)""")

for line in fileinput.input():
    print line
    cur.execute(line)

def convert(table, field):
	cur.execute("""ALTER TABLE """+table+""" ALTER COLUMN """+field+""" DROP DEFAULT,
		ALTER COLUMN """+field+""" TYPE timestamp with time zone
		USING
		    timestamp with time zone 'epoch' + """+field+""" * interval '1 millisecond',
		ALTER COLUMN """+field+""" SET DEFAULT now();
	""")

convert("artifacts", "creation_date")
convert("artifacts", "last_update_date")
convert("badges", "creation_date")
convert("badges", "last_update_date")
convert("badge_assertions", "issue_date")
convert("badge_assertions", "creation_date")
convert("badge_assertions", "last_update_date")
convert("cities", "creation_date")
convert("cities", "last_update_date")
convert("learner_groups", "creation_date")
convert("learner_groups", "last_update_date")
convert("learners", "creation_date")
convert("learners", "last_update_date")
convert("orgs", "city_join_date")
convert("orgs", "creation_date")
convert("orgs", "last_update_date")
convert("playlists", "publish_date")
convert("playlists", "creation_date")
convert("playlists", "last_update_date")
convert("rejected_orgs", "creation_date")
convert("rejected_orgs", "last_update_date")
convert("resources", "creation_date")
convert("resources", "last_update_date")
convert("submission_xps", "posted_date")
convert("submissions", "review_date")
convert("submissions", "ready_for_submit_date")
convert("submissions", "submit_date")
convert("user_invites", "invitation_date")
convert("user_invites", "code_expiration_date")
convert("users", "creation_date")
convert("users", "last_update_date")
convert("users", "last_login_date")
convert("xps", "remix_date")
convert("xps", "publish_date")
convert("xps", "creation_date")
convert("xps", "last_update_date")

conn.commit()
conn.close()