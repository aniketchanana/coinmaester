import logging
import signal
import sys

from consumer import GmailMessageConsumer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def main() -> None:
    consumer = GmailMessageConsumer()

    def shutdown(_signum: int, _frame: object) -> None:
        logging.info("Shutting down python-worker...")
        consumer.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    logging.info("python-worker started")
    consumer.start()


if __name__ == "__main__":
    main()
