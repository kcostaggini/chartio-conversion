#!/usr/bin/env bash
// 2>/dev/null;$(dirname $0)/exec.sh $0 "$@"; exit

function sanitize(value) {
	return value ? value.replace(new RegExp("\'", 'g'), "''") : value;
}

function parseReportArgs(
	args,
  usageLine
) {
	var options = {
		db: null,
		allowRemoteDb: false,

		extraOptions: {},
		extraArgs: []
	};

	for (var i=0; i<args.length; i++) {
		var arg = args[i];
		function param() {
			var param = args[++i];
			if (!param || param[0] === "-") {
				throw new Error(arg + " requires a parameter. Found " + param);
			}
			return param;
		}

		switch (arg) {
			case "-h":case "-?":case "--help":
			print(usageLine || "usage: " + PROGNAME + " <options> <arguments>");
			print("Options:");
			print("  --allow-remote-db: Allows use of non-local database");
			quit();
			break;

			case "--allow-remote-db": options.allowRemoteDb = true; break;

			default:
				if (arg[0] == "-") {
					if (args[i + 1] && args[i + 1][0] != "-") {
						options.extraOptions[arg] = param();
					} else {
						options.extraOptions[arg] = true;
					}
				} else {
					options.extraArgs.push(arg);
				}
		}
	}

	var c = connect("localhost/lrng");
	if (!c) throw new Error("Cannot connect to db localhost/lrng");
	options.db = c;

	return options;
}

function ensureLocalConnection(dbConn) {
	var connStr = (dbConn._mongo + "").split(":")[0];

	var allowedLocalStrings = [
		"connection to 127.0.0.1",
		"connection to localhost",
		"connection to ::1"
	];

	if (allowedLocalStrings.indexOf(connStr) < 0) {
		throw new Error("Database connection '" + connStr + "' is not a connection to a local mongo");
	}
}

function generateSubmissionsSql(
	options
) {
	if (! options.allowRemoteDb) {
		ensureLocalConnection(options.db);
	} else {
		print("WARNING: Database (" + options.db._mongo + ") is NOT LOCAL.");
	}

	var sourceDb = options.db.getSiblingDB("lrng");
	
	// Orgs
	sourceDb.org.find({}).forEach(function(org){
		for (var i=0; i<org.userInvites.length; i++) {
			var invite = org.userInvites[i];
			
			var invitation_date = invite.invitationDate;
			var code_expiration_date = invite.codeExpirationDate;
			var email = invite.personalDetails ? invite.personalDetails.email : null;
			var role = invite.personalDetails ? invite.personalDetails.role : null;
			var admin_first_name = invite.adminName ? invite.adminName.first : null;
			var admin_last_name = invite.adminName ? invite.adminName.last : null;
			
			print(
				"INSERT INTO user_invites (id, org_id, invitation_date, code_expiration_date, email, role, admin_first_name, admin_last_name) VALUES ("+
					"'"+new ObjectId() + "'," +
					"'"+org._id + "'," +
					(invitation_date ? invitation_date : null) + "," + 
					(code_expiration_date ? code_expiration_date : null) + "," + 
					(email ? "E'"+sanitize(email)+"'" : "''") + "," + 
					(role ? "E'"+sanitize(role)+"'" : "''") + "," + 					
					(admin_first_name ? "E'"+sanitize(admin_first_name)+"'" : "''") + "," + 
					(admin_last_name ? "E'"+sanitize(admin_last_name)+"'" : "''") +
				")"
			);
		}
	});	
	
	// XPs
	sourceDb.xp.find({}).forEach(function(xp){
		for (var i=0; i<xp.resourceIds.length; i++) {
			var resource_id = xp.resourceIds[i];
			print(
				"INSERT INTO xp_resources (id, xp_id, resource_id) VALUES ("+
					"'"+new ObjectId() + "'," +
					"'"+xp._id + "'," +
					"'"+resource_id + "'" +
				")"
			);
		}
	});
	
	// Playlists
	sourceDb.playlist.find({}).forEach(function(playlist){
		for (var i=0; i<playlist.xps.length; i++) {
			var xp = playlist.xps[i];
			print(
				"INSERT INTO playlist_xps (id, playlist_id, xp_id, required) VALUES ("+
					"'"+new ObjectId() + "'," +
					"'"+playlist._id + "'," +
					"'"+xp.id + "'," + 
					xp.required +
				")"
			);
		}
		
		for (var i=0; i<playlist.interests.length; i++) {
			var interest = playlist.interests[i];
			print(
				"INSERT INTO interests (id, playlist_id, interest) VALUES ("+
					"'"+new ObjectId() + "'," +
					"'"+playlist._id + "'," +
					"E'"+sanitize(interest) + "'" +
				")"
			);
		}
	});

	// Submissions
	sourceDb.submission.find({}).forEach(function(submission){
		var user_id = submission.userId;
		var playlist_id = submission.playlistId;
		
		for (var i=0; i<submission.history.length; i++) {
			var individualSubmission = submission.history[i];

			var review = individualSubmission.review ? individualSubmission.review.feedback : null;
			var reviewer_id = individualSubmission.review ? individualSubmission.review.reviewerId : null;
			var review_date = individualSubmission.review ? individualSubmission.review.reviewDate : null;
			var claimed = individualSubmission.claimed;
			var ready_for_submit_date = individualSubmission.readyForSubmitDate;
			var submit_date = individualSubmission.submitDate;
			var status = individualSubmission.status;
			
			var submission_id = new ObjectId();

			print(
				"INSERT INTO submissions (id, user_id, playlist_id, review, reviewer_id, review_date, claimed, ready_for_submit_date, submit_date, status) VALUES ("+
					"'"+submission_id + "'," +
					"'"+user_id + "'," + 
					"'"+playlist_id + "'," +
					(review ? "E'"+sanitize(review)+"'" : "''") + "," + 
					(reviewer_id ? "'"+reviewer_id+"'" : "''") + "," + 
					(review_date ? review_date : null) + "," + 
					claimed + "," + 
					(ready_for_submit_date ? ready_for_submit_date : null) + "," + 
					(submit_date ? submit_date : null) + "," + 
					"'"+status + "'" +
				")"
			);
			
			for (var j=0; j<individualSubmission.xpArtifacts.length; j++) {
				var xpArtifact = individualSubmission.xpArtifacts[j];
				
				var xp_id = xpArtifact.xp.xpId;
				var xp_type = xpArtifact.xp.xpType;
				var artifact_id = xpArtifact.artifactId;
				var status = xpArtifact.status;
				var posted_date = xpArtifact.postedDate;
				
				print(
					"INSERT INTO submission_xps (id, submission_id, xp_id, xp_type, artifact_id, posted_date, status) VALUES ("+
						"'"+new ObjectId() + "'," +
						"'"+submission_id + "'," +
						"'"+xp_id + "'," + 
						"'"+xp_type + "'," + 
						"'"+artifact_id + "'," + 
						(posted_date ? posted_date : null) + "," + 
						"'"+status + "'" +
					")"
				);
			}
		}
	});
}

var options = parseReportArgs(ARGS);
generateSubmissionsSql(options);