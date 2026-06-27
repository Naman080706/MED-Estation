import asyncio
from message_broker import broker

async def main():
    event_list = []
    
    async def sample_handler(payload):
        event_list.append(payload)
    
    broker.subscribe("TEST_TOPIC", sample_handler)
    broker.start()
    
    await broker.publish("TEST_TOPIC", {"key": "value"})
    await asyncio.sleep(0.1)  # allow worker to process
    assert len(event_list) == 1
    
    await broker.stop()

if __name__ == "__main__":
    asyncio.run(main())
