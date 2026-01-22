# Underchex - C Implementation Makefile
# Signed-by: agent #25 claude-sonnet-4 via opencode 20260122T07:19:41

CC = gcc
CFLAGS = -Wall -Wextra -O2 -std=c11
LDFLAGS = -lncurses

# For macOS with Homebrew ncurses
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    NCURSES_PREFIX := $(shell brew --prefix ncurses 2>/dev/null || echo /usr/local)
    CFLAGS += -I$(NCURSES_PREFIX)/include
    LDFLAGS = -L$(NCURSES_PREFIX)/lib -lncurses
endif

# Source files
SRCS = main.c board.c moves.c ai.c display.c
OBJS = $(SRCS:.c=.o)
TARGET = underchex

# Test files
TEST_SRCS = tests/test_main.c board.c moves.c ai.c
TEST_OBJS = $(TEST_SRCS:.c=.o)
TEST_TARGET = test_underchex

.PHONY: all clean test

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

test: $(TEST_TARGET)
	./$(TEST_TARGET)

$(TEST_TARGET): $(TEST_OBJS)
	$(CC) $(CFLAGS) -o $@ $^

tests/test_main.o: tests/test_main.c
	@mkdir -p tests
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJS) $(TARGET) $(TEST_OBJS) $(TEST_TARGET)

# Dependencies
board.o: board.c board.h
moves.o: moves.c moves.h board.h
ai.o: ai.c ai.h board.h moves.h
display.o: display.c display.h board.h moves.h
main.o: main.c board.h moves.h ai.h display.h
