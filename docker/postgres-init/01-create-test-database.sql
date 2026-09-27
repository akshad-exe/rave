-- Creates the dedicated test database used by `bun run test` in apps/server.
-- Postgres only runs scripts in this directory on first initialization of an
-- empty volume, so this is a no-op on subsequent boots.
CREATE DATABASE rave_test;
