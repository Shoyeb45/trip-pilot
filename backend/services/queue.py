from queue import Queue

queue = Queue()

class JobQueue:

    @classmethod
    def pop(cls):
        """
        Retrieves and removes an item from the queue. Blocks if the queue is empty.
        """
        return queue.get()

    @classmethod
    def top(cls):
        """
        Returns the first item in the queue without removing it.
        Non-blocking. Returns None if empty.
        """
        with queue.mutex:
            if queue.queue:
                return queue.queue[0]
        return None

    @classmethod
    def push(cls, item):
        """
        Pushes an item into the queue.
        """
        queue.put(item)

