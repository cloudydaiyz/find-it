import update_infra
import requests
import pytest

# Get all the URLs for our infrastructure
out = update_infra.main({'output': True, 'plan': False, 'no-prod': False, 'destroy': False})

@pytest.fixture
def auth_url():
    return out['lambda_function_urls']['value']['auth']['function_url']

@pytest.fixture
def game_url():
    return out['lambda_function_urls']['value']['game']['function_url']

@pytest.fixture
def players_url():
    return out['lambda_function_urls']['value']['players']['function_url']

@pytest.fixture
def tasks_url():
    return out['lambda_function_urls']['value']['tasks']['function_url']

@pytest.fixture
def new_game(auth_url, game_url):
    login = requests.post(auth_url + "/login", json={"username": "another", "password": "person"})
    assert login.status_code == 200
    creds = login.json()

    # should create a game
    settings = {
        "name": "test game",
        "duration": 0,
        "startTime": 0,
        "endTime": 0,
        "ordered": False,
        "minPlayers": 0,
        "maxPlayers": 0,
        "joinMidGame": False,
        "numRequiredTasks": 0
    }
    tasks = [{
        "type": "multiple choice",
        "question": "What is today's day?",
        "clue": "Nothing",
        "answerChoices": ["Monday", "Someday", "Sunday"],
        "answers": [2],
        "attempts": 1,
        "required": True,
        "points": 25,
        "scalePoints": True
    }]
    res = requests.post(game_url + "/game", 
                        json={"settings": settings, "tasks": tasks}, 
                        headers={"token": creds['accessToken']})
    assert res.status_code == 200

    res_json = res.json()
    host_creds = res_json['creds']
    game_id = res_json['gameid']
    return (host_creds, game_id)

@pytest.fixture
def new_game_with_player(auth_url, game_url, players_url):
    print("players test")

    host_login = requests.post(auth_url + "/login", json={"username": "kylan", "password": "duncan"})
    assert host_login.status_code == 200
    player_creds = host_login.json()

    # should create a game
    settings = {
        "name": "test game",
        "duration": 0,
        "startTime": 0,
        "endTime": 0,
        "ordered": False,
        "minPlayers": 0,
        "maxPlayers": 0,
        "joinMidGame": False,
        "numRequiredTasks": 0
    }
    tasks = []
    res = requests.post(game_url + "/game", 
                        json={"settings": settings, "tasks": tasks}, 
                        headers={"token": player_creds['accessToken']})
    assert res.status_code == 200
    res_json = res.json()
    host_creds = res_json['creds']
    game_id = res_json['gameid']

    # join the new game
    player_login = requests.post(auth_url + "/login", json={"username": "another", "password": "person"})
    assert player_login.status_code == 200
    creds = player_login.json()

    res = requests.post(f"{players_url}/game/{game_id}/players", 
                        json={"role": "player"}, 
                        headers={"token": creds['accessToken']})
    assert res.status_code == 200
    player_creds = res.json()

    return (host_creds, game_id, player_creds)

class TestAuth:

    # should register a user successfully
    @pytest.mark.skip(reason="Need to randomize")
    def test_auth(self, auth_url):
        res = requests.post(auth_url + "/register", json={"username": "another", "password": "person"})
        assert res.status_code == 200

    # should login a user successfully
    def test_login_user(self, auth_url):
        res = requests.post(auth_url + "/login", json={"username": "another", "password": "person"})
        assert res.status_code == 200

    # should return error for missing body
    def test_missing_body(self, auth_url):
        res = requests.post(auth_url + "/login")
        assert res.status_code == 400

    # should return error for invalid path
    def test_invalid_path(self, auth_url):
        res = requests.post(auth_url+ "/err", json={"username": "another", "password": "person"})
        assert res.status_code == 400

    # should return error for invalid method
    def test_invalid_method(self, auth_url):
        res = requests.get(auth_url + "/login", json={"username": "another", "password": "person"})
        assert res.status_code == 400

class TestGame:

    # should get a public game
    def test_game(self, new_game, game_url):
        (host_creds, game_id) = new_game

        # note: this would give the same result if the public param was omitted
        res = requests.get(f"{game_url}/game/{game_id}?public=true")
        assert res.status_code == 200

    # should get private game details
    def test_get_private_game(self, new_game, game_url):
        (host_creds, game_id) = new_game
        res = requests.get(f"{game_url}/game/{game_id}?public=false",
                        headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

    # should start, stop, and restart a game
    def test_game_actions(self, new_game, game_url):
        (host_creds, game_id) = new_game

        # should start a game
        res = requests.post(f"{game_url}/game/{game_id}",
                            json={"action": "start"},
                            headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

        # should end a game
        res = requests.post(f"{game_url}/game/{game_id}?public=true",
                            json={"action": "stop"},
                            headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

        # should restart a game
        res = requests.post(f"{game_url}/game/{game_id}?public=true",
                            json={"action": "restart"},
                            headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

class TestPlayers:

    # host shouldn't be able to join the game
    def test_host_cant_join(self, new_game_with_player, players_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.post(f"{players_url}/game/{game_id}/players", 
                            json={"role": "player"}, 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 400

    # should view all public players
    def test_view_public_players(self, new_game_with_player, players_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/game/{game_id}/players?public=true")
        assert res.status_code == 200

    # should view all players
    def test_view_private_players(self, new_game_with_player, players_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/game/{game_id}/players?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # should view a player
    def test_view_public_player(self, new_game_with_player, players_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/game/{game_id}/players/another?public=true")
        assert res.status_code == 200

    # should view a private player
    def test_view_private_player(self, new_game_with_player, players_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/game/{game_id}/players/another?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # players should be able to view their own info
    def test_view_players_own_info(self, new_game_with_player, players_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/game/{game_id}/players/another?public=false", 
                            headers={"token": player_creds['accessToken']})
        assert res.status_code == 200

class TestTasks:

    # should view all public tasks
    def test_tasks(self, new_game_with_player, tasks_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{tasks_url}/game/{game_id}/tasks?public=true")
        assert res.status_code == 200

    # should view (private) info for all tasks
    def test_view_private_tasks(self, new_game_with_player, tasks_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{tasks_url}/game/{game_id}/tasks?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # should view public task
    def test_view_public_task(self, new_game_with_player, tasks_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{tasks_url}/game/{game_id}/tasks/:id?public=true")
        assert res.status_code == 200

    # should view (private) info for task
    def test_view_private_task(self, new_game_with_player, tasks_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.get(f"{tasks_url}/game/{game_id}/tasks/:id?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # should submit task
    def test_submit_task(self, new_game_with_player, tasks_url):
        (host_creds, game_id, player_creds) = new_game_with_player

        res = requests.post(f"{tasks_url}/game/{game_id}/tasks/:id?public=false", 
                            json={"answers": ["Someday"]}, 
                            headers={"token": player_creds['accessToken']})
        assert res.status_code == 200

if __name__ == "__main__":
    pytest.main()