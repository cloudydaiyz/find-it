from time import sleep
import update_infra
import secret
import requests
import pytest
import boto3
import botocore

# Get all the URLs for our infrastructure
out = update_infra.main({'output': True, 'plan': False, 'no-prod': False, 'destroy': False})


'''
### FIXTURES ###
'''

@pytest.fixture(scope="session")
def auth_url():
    return out['lambda_function_urls']['value']['auth']['function_url']

@pytest.fixture(scope="session")
def game_url():
    return out['game_lambda_function_url']['value']['function_url']

@pytest.fixture(scope="session")
def players_url():
    return out['lambda_function_urls']['value']['players']['function_url']

@pytest.fixture(scope="session")
def tasks_url():
    return out['lambda_function_urls']['value']['tasks']['function_url']

@pytest.fixture(scope="module", autouse=True)
def initial_users(auth_url):
    requests.post(auth_url + "/register", json={"username": "kylan", "password": "duncan"})
    requests.post(auth_url + "/register", json={"username": "another", "password": "person"})
    yield
    requests.delete(auth_url + "/user/kylan", headers={"code": secret.admincode})
    requests.delete(auth_url + "/user/another", headers={"code": secret.admincode})


@pytest.fixture
def new_game(auth_url, game_url):
    login = requests.post(auth_url + "/login", json={"username": "kylan", "password": "duncan"})
    assert login.status_code == 200
    creds = login.json()

    # should create a game
    settings = {
        "name": "test game",
        "duration": 0,
        "startTime": 0,
        "ordered": False,
        "minPlayers": 1,
        "maxPlayers": 5,
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
        "scalePoints": False
    }]
    res = requests.post(game_url + "/games", 
                        json={"settings": settings, "tasks": tasks}, 
                        headers={"token": creds['accessToken']})
    assert res.status_code == 200
    res_json = res.json()

    host_creds = res_json['creds']
    game_id = res_json['gameid']
    task_ids = res_json['taskids']
    print(game_id)
    yield (host_creds, game_id, task_ids)

    # Delete the game
    res = requests.delete(game_url + "/games/" + game_id, 
                        headers={"token": host_creds['accessToken']})
    assert res.status_code == 200

@pytest.fixture
def new_game_with_duration(auth_url, game_url):
    login = requests.post(auth_url + "/login", json={"username": "kylan", "password": "duncan"})
    assert login.status_code == 200
    creds = login.json()

    # should create a game
    settings = {
        "name": "test game",
        "duration": 30,
        "startTime": 0,
        "ordered": False,
        "minPlayers": 1,
        "maxPlayers": 5,
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
        "scalePoints": False
    }]
    res = requests.post(game_url + "/games", 
                        json={"settings": settings, "tasks": tasks}, 
                        headers={"token": creds['accessToken']})
    print(res.text)
    assert res.status_code == 200
    res_json = res.json()

    host_creds = res_json['creds']
    game_id = res_json['gameid']
    task_ids = res_json['taskids']
    print(game_id)
    yield (host_creds, game_id, task_ids)

    # Delete the game
    res = requests.delete(game_url + "/games/" + game_id, 
                        headers={"token": host_creds['accessToken']})
    assert res.status_code == 200

@pytest.fixture
def new_game_with_player(new_game, auth_url, players_url):
    (host_creds, game_id, task_ids) = new_game

    # login
    player_login = requests.post(auth_url + "/login", json={"username": "another", "password": "person"})
    assert player_login.status_code == 200
    creds = player_login.json()

    # join the new game
    res = requests.post(f"{players_url}/games/{game_id}/players", 
                        json={"role": "player"}, 
                        headers={"token": creds['accessToken']})
    assert res.status_code == 200
    player_creds = res.json()

    return (host_creds, game_id, task_ids, player_creds)

@pytest.fixture
def new_running_game_with_player(new_game_with_player, game_url):
    (host_creds, game_id, task_ids, player_creds) = new_game_with_player

    # start the new game
    res = requests.post(f"{game_url}/games/{game_id}",
                        json={"action": "start"},
                        headers = {"token": host_creds["accessToken"]})
    assert res.status_code == 200

    yield (host_creds, game_id, task_ids, player_creds)

    # stop the new game
    res = requests.post(f"{game_url}/games/{game_id}",
                        json={"action": "stop"},
                        headers = {"token": host_creds["accessToken"]})
    assert res.status_code == 200

'''
### TESTS ###
'''

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
        (host_creds, game_id, task_ids) = new_game

        # note: this would give the same result if the public param was omitted
        res = requests.get(f"{game_url}/games/{game_id}?public=true")
        assert res.status_code == 200

    # should get private game details
    def test_get_private_game(self, new_game, game_url):
        (host_creds, game_id, task_ids) = new_game
        res = requests.get(f"{game_url}/games/{game_id}?public=false",
                        headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

    # should start, stop, and restart a game
    def test_game_actions(self, new_game_with_player, game_url):
        (host_creds, game_id, task_ids, player_creds) = new_game_with_player

        # should start a game
        res = requests.post(f"{game_url}/games/{game_id}",
                            json={"action": "start"},
                            headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

        # should end a game
        res = requests.post(f"{game_url}/games/{game_id}?public=true",
                            json={"action": "stop"},
                            headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200

        # should restart a game
        res = requests.post(f"{game_url}/games/{game_id}?public=true",
                            json={"action": "restart"},
                            headers = {"token": host_creds["accessToken"]})
        assert res.status_code == 200
        res_json = res.json()
        new_host_creds = res_json['creds']
        new_game_id = res_json['gameid']

        # delete the newly created game from restart
        res = requests.delete(game_url + "/games/" + new_game_id, 
                                headers={"token": new_host_creds['accessToken']})
        assert res.status_code == 200
    
    # Tests the new_game_with_duration fixture
    def test_game_with_duration(self, new_game_with_duration, auth_url, players_url, game_url):
        (host_creds, game_id, task_ids) = new_game_with_duration
        
        # login
        player_login = requests.post(auth_url + "/login", json={"username": "another", "password": "person"})
        assert player_login.status_code == 200
        creds = player_login.json()

        # join the new game
        res = requests.post(f"{players_url}/games/{game_id}/players", 
                            json={"role": "player"}, 
                            headers={"token": creds['accessToken']})
        assert res.status_code == 200

        # start the new game
        res = requests.post(f"{game_url}/games/{game_id}",
                            json={"action": "start"},
                            headers = {"token": host_creds["accessToken"]})
        print(res.text)
        assert res.status_code == 200

        # Ensure the schedule is created
        session = boto3.Session(profile_name=secret.profile, region_name=secret.region)
        scheduler_client = session.client('scheduler')
        print(game_id)
        schedule = scheduler_client.get_schedule(
            GroupName='vulture',
            Name=f'end-game-{game_id}'
        )
        print(schedule['Arn'])

        # Need to sleep longer than 30 seconds because of delay from EventBridge
        sleep(90)

        # Ensure the schedule is deleted
        try:
            schedule = scheduler_client.get_schedule(
                GroupName='vulture',
                Name=f'end-game-{game_id}'
            )
            raise UserWarning("Schedule should've been deleted")
        except botocore.exceptions.ClientError as error:
            print("Schedule deleted correctly")
            print(error.response)
        except Exception:
            raise Exception("Invalid state; schedule exists when it's supposed to be deleted")
        finally:
            scheduler_client.close()
        
        # Ensure the game has ended
        res = requests.get(f"{game_url}/games/{game_id}?public=false",
                        headers = {"token": host_creds["accessToken"]})
        print(res.text)
        assert res.status_code == 200
        assert res.json()['state'] == 'ended'


class TestPlayers:

    # host shouldn't be able to join the game
    def test_host_cant_join(self, new_game, players_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.post(f"{players_url}/games/{game_id}/players", 
                            json={"role": "player"}, 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 400

    # should view all public players
    def test_view_public_players(self, new_game, players_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.get(f"{players_url}/games/{game_id}/players?public=true")
        assert res.status_code == 200

    # should view all players
    def test_view_private_players(self, new_game, players_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.get(f"{players_url}/games/{game_id}/players?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # should view a player
    def test_view_public_player(self, new_game_with_player, players_url):
        (host_creds, game_id, task_ids, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/games/{game_id}/players/another?public=true")
        assert res.status_code == 200

    # should view a private player
    def test_view_private_player(self, new_game_with_player, players_url):
        (host_creds, game_id, task_ids, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/games/{game_id}/players/another?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # players should be able to view their own info
    def test_view_players_own_info(self, new_game_with_player, players_url):
        (host_creds, game_id, task_ids, player_creds) = new_game_with_player

        res = requests.get(f"{players_url}/games/{game_id}/players/another?public=false", 
                            headers={"token": player_creds['accessToken']})
        assert res.status_code == 200

class TestTasks:

    # should view all public tasks
    def test_tasks(self, new_game, tasks_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.get(f"{tasks_url}/games/{game_id}/tasks?public=true")
        assert res.status_code == 200

    # should view (private) info for all tasks
    def test_view_private_tasks(self, new_game, tasks_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.get(f"{tasks_url}/games/{game_id}/tasks?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # should view public task
    def test_view_public_task(self, new_game, tasks_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.get(f"{tasks_url}/games/{game_id}/tasks/{task_ids[0]}?public=true")
        assert res.status_code == 200

    # should view (private) info for task
    def test_view_private_task(self, new_game, tasks_url):
        (host_creds, game_id, task_ids) = new_game

        res = requests.get(f"{tasks_url}/games/{game_id}/tasks/{task_ids[0]}?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200

    # should submit task successfully
    def test_submit_task(self, new_running_game_with_player, players_url, tasks_url):
        (host_creds, game_id, task_ids, player_creds) = new_running_game_with_player

        # Get the player's previous points (should be 0)
        res = requests.get(f"{players_url}/games/{game_id}/players/another?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200
        player_points = res.json()['points']
        assert player_points == 0

        res = requests.post(f"{tasks_url}/games/{game_id}/tasks/{task_ids[0]}/submit", 
                            json={"answers": ["Sunday"]}, 
                            headers={"token": player_creds['accessToken']})
        assert res.status_code == 200
        assert res.json()['success']

        # Get the player's new points (should be 25)
        res = requests.get(f"{players_url}/games/{game_id}/players/another?public=false", 
                            headers={"token": host_creds['accessToken']})
        assert res.status_code == 200
        new_player_points = res.json()['points']
        assert new_player_points == 25

if __name__ == "__main__":
    pytest.main()