import { test } from "node:test";
import assert from "node:assert/strict";
import { attachEventTeamLogos, dedupeEspnTeams, matchGameTeams, normalizeTeamName, teamNameAliases, type EspnTeam } from "./espn";

const team = (
  id: string, sport: string, league: string, name: string, abbreviation: string, aliases: string[],
): EspnTeam => ({
  id, sport, league, name, abbreviation,
  logo: `https://a.espncdn.com/i/teamlogos/test/500/${id.toLowerCase()}.png`,
  aliases: aliases.flatMap(teamNameAliases),
});

test("matches Kalshi matchup sides to ESPN team logos", () => {
  const teams = [
    team("1", "Basketball", "NBA", "New York Knicks", "NY", ["New York Knicks", "New York", "Knicks", "NY"]),
    team("2", "Basketball", "NBA", "Toronto Raptors", "TOR", ["Toronto Raptors", "Toronto", "Raptors", "TOR"]),
  ];
  assert.deepEqual(matchGameTeams("New York vs Toronto", teams).map(item => item.abbreviation), ["NY", "TOR"]);
});

test("expands ESPN city aliases when Kalshi spells the city out", () => {
  const teams = [
    team("9", "Basketball", "NBA", "LA Clippers", "LAC", ["LA Clippers", "Clippers", "LAC"]),
    team("10", "Basketball", "NBA", "Los Angeles Lakers", "LAL", ["Los Angeles Lakers", "Los Angeles", "Lakers", "LAL"]),
    team("11", "Basketball", "NBA", "Utah Jazz", "UTAH", ["Utah Jazz", "Utah", "Jazz", "UTAH"]),
  ];
  assert.deepEqual(matchGameTeams("Utah vs Los Angeles C", teams).map(item => item.abbreviation), ["UTAH", "LAC"]);
});

test("uses source title prefixes without guessing NFL New York teams", () => {
  const teams = [
    team("3", "Football", "NFL", "New York Jets", "NYJ", ["New York Jets", "New York", "Jets", "NYJ"]),
    team("4", "Football", "NFL", "New York Giants", "NYG", ["New York Giants", "New York", "Giants", "NYG"]),
    team("5", "Football", "NFL", "Los Angeles Chargers", "LAC", ["Los Angeles Chargers", "Los Angeles", "Chargers", "LAC"]),
  ];
  assert.deepEqual(matchGameTeams("New York J vs Los Angeles C", teams).map(item => item.abbreviation), ["NYJ", "LAC"]);
  assert.deepEqual(matchGameTeams("New York vs Los Angeles", teams).map(item => item.abbreviation), ["LAC"]);
});

test("deduplicates men's and women's school entries before matching", () => {
  const teams = [
    team("12", "Basketball", "NCAAB", "Tennessee Volunteers", "TENN", ["Tennessee Volunteers", "Tennessee", "Volunteers", "TENN"]),
    team("13", "Basketball", "NCAAB", "Tennessee Lady Volunteers", "TENN", ["Tennessee Lady Volunteers", "Tennessee", "Lady Volunteers", "TENN"]),
    team("14", "Basketball", "NCAAB", "Belmont Bruins", "BEL", ["Belmont Bruins", "Belmont", "Bruins", "BEL"]),
  ];
  assert.deepEqual(matchGameTeams("Tennessee vs Belmont", dedupeEspnTeams(teams)).map(item => item.abbreviation), ["TENN", "BEL"]);
});

test("normalizes college abbreviations without confusing Ohio schools", () => {
  const teams = [
    team("6", "Football", "NCAAF", "Ball State Cardinals", "BSU", ["Ball State Cardinals", "Ball State", "Cardinals", "BSU"]),
    team("7", "Football", "NCAAF", "Ohio Bobcats", "OHIO", ["Ohio Bobcats", "Ohio", "Bobcats", "OHIO"]),
    team("8", "Football", "NCAAF", "Ohio State Buckeyes", "OSU", ["Ohio State Buckeyes", "Ohio State", "Buckeyes", "OSU"]),
  ];
  assert.deepEqual(matchGameTeams("Ball St. vs Ohio", teams).map(item => item.abbreviation), ["BSU", "OHIO"]);
});

test("leaves futures and non-matchup titles without logos", () => {
  const teams = [team("9", "Basketball", "NBA", "Boston Celtics", "BOS", ["Boston Celtics", "Boston", "Celtics", "BOS"])];
  assert.deepEqual(matchGameTeams("NBA Championship Winner", teams), []);
});

test("attaches matchup logos to individual events, including international soccer", () => {
  const teams = [
    team("1", "Basketball", "NBA", "New York Knicks", "NY", ["New York Knicks", "New York", "NY"]),
    team("2", "Basketball", "NBA", "Toronto Raptors", "TOR", ["Toronto Raptors", "Toronto", "TOR"]),
    team("15", "Soccer", "International", "Denmark", "DEN", ["Denmark", "DEN"]),
    team("16", "Soccer", "International", "Norway", "NOR", ["Norway", "NOR"]),
  ];
  const basketball = attachEventTeamLogos({ title: "New York vs Toronto: Spread", sport: "Basketball", league: "NBA" }, teams);
  const soccer = attachEventTeamLogos({ title: "Denmark vs Norway", sport: "Soccer", league: "" }, teams);
  assert.deepEqual(basketball.teams.map(item => item.abbreviation), ["NY", "TOR"]);
  assert.deepEqual(soccer.teams.map(item => item.abbreviation), ["DEN", "NOR"]);
});
