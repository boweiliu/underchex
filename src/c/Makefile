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
SRCS = main.c board.c moves.c ai.c display.c tablebase.c
OBJS = $(SRCS:.c=.o)
TARGET = underchex

# Test files
TEST_SRCS = tests/test_main.c board.c moves.c ai.c tablebase.c
TEST_OBJS = $(TEST_SRCS:.c=.o)
TEST_TARGET = test_underchex

# Cross-implementation test files
CROSSIMPL_SRCS = tests/test_crossimpl.c board.c moves.c ai.c tablebase.c
CROSSIMPL_OBJS = $(CROSSIMPL_SRCS:.c=.o)
CROSSIMPL_TARGET = test_crossimpl

# Cross-implementation tablebase test files
CROSSIMPL_TB_SRCS = tests/test_crossimpl_tablebase.c board.c moves.c ai.c tablebase.c
CROSSIMPL_TB_OBJS = $(CROSSIMPL_TB_SRCS:.c=.o)
CROSSIMPL_TB_TARGET = test_crossimpl_tablebase

.PHONY: all clean test test-crossimpl test-crossimpl-tablebase test-all

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) $(CFLAGS) -c -o $@ $<

test: $(TEST_TARGET)
	./$(TEST_TARGET)

test-crossimpl: $(CROSSIMPL_TARGET)
	./$(CROSSIMPL_TARGET)

test-crossimpl-tablebase: $(CROSSIMPL_TB_TARGET)
	./$(CROSSIMPL_TB_TARGET)

test-all: test test-crossimpl test-crossimpl-tablebase

$(TEST_TARGET): $(TEST_OBJS)
	$(CC) $(CFLAGS) -o $@ $^

$(CROSSIMPL_TARGET): $(CROSSIMPL_OBJS)
	$(CC) $(CFLAGS) -o $@ $^

$(CROSSIMPL_TB_TARGET): $(CROSSIMPL_TB_OBJS)
	$(CC) $(CFLAGS) -o $@ $^

tests/test_main.o: tests/test_main.c
	@mkdir -p tests
	$(CC) $(CFLAGS) -c -o $@ $<

tests/test_crossimpl.o: tests/test_crossimpl.c
	@mkdir -p tests
	$(CC) $(CFLAGS) -c -o $@ $<

tests/test_crossimpl_tablebase.o: tests/test_crossimpl_tablebase.c
	@mkdir -p tests
	$(CC) $(CFLAGS) -c -o $@ $<

clean:
	rm -f $(OBJS) $(TARGET) $(TEST_OBJS) $(TEST_TARGET) $(CROSSIMPL_OBJS) $(CROSSIMPL_TARGET) $(CROSSIMPL_TB_OBJS) $(CROSSIMPL_TB_TARGET)

# Dependencies
board.o: board.c board.h
moves.o: moves.c moves.h board.h
ai.o: ai.c ai.h board.h moves.h
tablebase.o: tablebase.c tablebase.h board.h moves.h ai.h
display.o: display.c display.h board.h moves.h
main.o: main.c board.h moves.h ai.h display.h tablebase.h
