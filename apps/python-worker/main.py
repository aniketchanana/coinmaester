import time


def main():
    print("Hello from python-worker!")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Shutting down python-worker...")


if __name__ == "__main__":
    main()
