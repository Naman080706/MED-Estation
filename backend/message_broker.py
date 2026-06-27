import asyncio
import logging
from typing import Callable, Coroutine, Any, Dict

logger = logging.getLogger(__name__)

class EventBroker:
    """
    A simple zero-dependency async event broker representing the EDA layer.
    In production, this would be backed by Redis Pub/Sub, Kafka, or RabbitMQ.
    """
    def __init__(self):
        self.subscribers: Dict[str, list[Callable[[dict], Coroutine[Any, Any, None]]]] = {}
        # A background task queue
        self.queue = asyncio.Queue()
        self._worker_task = None
        
    def subscribe(self, event_type: str, handler: Callable[[dict], Coroutine[Any, Any, None]]):
        """Register an async handler for a given event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)
        logger.info(f"Subscribed handler to {event_type}")

    async def publish(self, event_type: str, payload: dict):
        """Publish an event to the queue for background processing."""
        await self.queue.put((event_type, payload))
        logger.debug(f"Event published: {event_type}")

    async def _worker(self):
        """Background worker that continuously processes events from the queue."""
        logger.info("EventBroker worker started.")
        while True:
            try:
                event_type, payload = await self.queue.get()
                handlers = self.subscribers.get(event_type, [])
                
                # Execute handlers concurrently
                tasks = [handler(payload) for handler in handlers]
                if tasks:
                    await asyncio.gather(*tasks, return_exceptions=True)
                
                self.queue.task_done()
            except Exception as e:
                logger.error(f"Error in EventBroker worker: {e}")

    def start(self):
        """Start the background worker. Call this during app startup."""
        loop = asyncio.get_running_loop()
        self._worker_task = loop.create_task(self._worker())

    async def stop(self):
        """Stop the background worker. Call this during app shutdown."""
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                logger.info("EventBroker worker stopped.")

# Global instance to be imported and used across the app
broker = EventBroker()
