package db

var migrationInfo map[int]Migration = map[int]Migration{
	0: Migration{
		version: 0,
		up: []string{
			"CREATE TABLE IF NOT EXISTS configuration(field VARCHAR(255) PRIMARY KEY, value TINYTEXT);",
		},
		down: []string{},
	},
	1: Migration{
		version: 1,
		up: []string{
			"CREATE TABLE IF NOT EXISTS complexes(id INT PRIMARY KEY, name TINYTEXT, ip VARCHAR(20));",
			"INSERT INTO complexes (id, name, ip) VALUES(0, 'Complex0', '192.168.0.20');",
			"INSERT INTO complexes (id, name, ip) VALUES(1, 'Complex1', '192.168.0.21');",
			"INSERT INTO complexes (id, name, ip) VALUES(2, 'Complex2', '192.168.0.22');",
			"INSERT INTO complexes (id, name, ip) VALUES(3, 'Complex3', '192.168.0.23');",
			"INSERT INTO complexes (id, name, ip) VALUES(4, 'Complex4', '192.168.0.24');",
			"INSERT INTO complexes (id, name, ip) VALUES(5, 'Complex5', '192.168.0.25');",
			"INSERT INTO complexes (id, name, ip) VALUES(6, 'Complex6', '192.168.0.26');",
			"INSERT INTO complexes (id, name, ip) VALUES(7, 'Complex7', '192.168.0.27');",
			"INSERT INTO complexes (id, name, ip) VALUES(8, 'Complex8', '192.168.0.28');",
			"INSERT INTO complexes (id, name, ip) VALUES(9, 'Complex9', '192.168.0.29');",
			"INSERT INTO complexes (id, name, ip) VALUES(10, 'Complex10', '127.0.0.1');",
		},
		down: []string{
			"DROP TABLE IF EXISTS configuration;",
		},
	},
	2: Migration{
		version: 2,
		up: []string{
			"CREATE TABLE IF NOT EXISTS users(id VARCHAR(100) PRIMARY KEY, name TINYTEXT, password TINYTEXT, role TINYTEXT);",
			"INSERT INTO users (id, name, password, role) VALUES(uuid(), 'admin', 'fa9beb99e4029ad5a6615399e7bbae21356086b3', 'admin');",
		},
		down: []string{
			"DROP TABLE IF EXISTS complexes;",
		},
	},
	3: Migration{
		version: 3,
		up: []string{
			"CREATE TABLE IF NOT EXISTS sensorData(id INT PRIMARY KEY AUTO_INCREMENT, complexID INT, type TINYTEXT, value DOUBLE, timestamp TIMESTAMP);",
		},
		down: []string{
			"DROP TABLE IF EXISTS users;",
		},
	},
	4: Migration{
		version: 4,
		up: []string{
			"DELETE FROM complexes WHERE id = 0;",
		},
		down: []string{
			"DROP TABLE IF EXISTS sensorData;",
		},
	},
	5: Migration{
		version: 5,
		up: []string{
			"ALTER TABLE complexes CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;",
			"ALTER TABLE users CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;",
			"ALTER TABLE configuration CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;",
			"ALTER TABLE sensorData CONVERT TO CHARACTER SET utf8 COLLATE utf8_general_ci;",
		},
		down: []string{
			"INSERT INTO complexes (id, name, ip) VALUES(0, 'Complex0', '192.168.0.20');",
		},
	},
	6: Migration{
		version: 6,
		up: []string{
			"ALTER TABLE users ADD COLUMN changePassword BOOL DEFAULT 0;",
			"UPDATE users SET changePassword=1 WHERE name='admin';",
		},
		down: []string{
			"ALTER TABLE complexes CONVERT TO CHARACTER SET latin1 COLLATE latin1_bin;",
			"ALTER TABLE users CONVERT TO CHARACTER SET latin1 COLLATE latin1_bin;",
			"ALTER TABLE configuration CONVERT TO CHARACTER SET latin1 COLLATE latin1_bin;",
			"ALTER TABLE sensorData CONVERT TO CHARACTER SET latin1 COLLATE latin1_bin;",
		},
	},
	7: Migration{
		version: 7,
		up: []string{
			"CREATE TABLE IF NOT EXISTS complexesConfiguration(complexID INT, sensorType VARCHAR(128), updatePeriod INT, PRIMARY KEY (complexID, sensorType));",
		},
		down: []string{
			"ALTER TABLE users DROP COLUMN changePassword;",
		},
	},
	8: Migration{
		version: 8,
		up:      []string{},
		down: []string{
			"DROP TABLE IF EXISTS complexesConfiguration;",
		},
	},
}
