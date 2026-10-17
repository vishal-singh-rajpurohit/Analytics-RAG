import taskiq
from taskiq_redis import ListQueueBroker
import taskiq_fastapi


broker = ListQueueBroker(
    url="redis://localhost:6379",
    socket_timeout=None,
    socket_connect_timeout=5,
)

taskiq_fastapi.init(broker, "app.main:app")