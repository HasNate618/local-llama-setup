#!/usr/bin/env python3
"""Terminal Tetris with ASCII graphics and colors"""

import curses
import random
import time
import os

# Tetromino definitions
SHAPES = {
    'I': [[1, 1, 1, 1]],
    'J': [[1, 0, 0], [1, 1, 1]],
    'L': [[0, 0, 1], [1, 1, 1]],
    'O': [[1, 1], [1, 1]],
    'S': [[0, 1, 1], [1, 1, 0]],
    'T': [[0, 1, 0], [1, 1, 1]],
    'Z': [[1, 1, 0], [0, 1, 1]],
}

COLORS = {
    'I': 2,  # Cyan
    'J': 5,  # Magenta
    'L': 3,  # Yellow
    'O': 4,  # Green
    'S': 6,  # Green (light)
    'T': 1,  # Blue
    'Z': 7,  # Red
}

# Game constants
BOARD_WIDTH = 10
BOARD_HEIGHT = 20
INITIAL_SPEED = 0.5
SPEED_INCREMENT = 0.02

def rotate_piece(piece):
    """Rotate a piece 90 degrees clockwise"""
    return [list(row) for row in zip(*piece[::-1])]

class TetrisGame:
    def __init__(self):
        self.reset()
        self.score = 0
        self.level = 1
        self.lines_cleared = 0
    
    def reset(self):
        """Reset game state"""
        self.board = [[0] * BOARD_WIDTH for _ in range(BOARD_HEIGHT)]
        self.current_piece = self.new_piece()
        self.current_pos = {'x': BOARD_WIDTH // 2 - 2, 'y': 0}
        self.game_over = False
        self.paused = False
        self.next_piece = self.new_piece()
        self.spawn_next_piece()
    
    def new_piece(self):
        """Get a random new piece"""
        piece_type = random.choice(list(SHAPES.keys()))
        return {
            'type': piece_type,
            'shape': SHAPES[piece_type],
            'color': COLORS[piece_type]
        }
    
    def spawn_next_piece(self):
        """Spawn the next piece"""
        self.current_piece = self.next_piece
        self.current_pos = {'x': BOARD_WIDTH // 2 - 2, 'y': 0}
        self.next_piece = self.new_piece()
        
        # Check if game over on spawn
        if not self.check_collision(self.current_pos['x'], self.current_pos['y'], self.current_piece['shape']):
            self.game_over = True
    
    def check_collision(self, x, y, shape):
        """Check if piece collides with board or walls"""
        for row_idx, row in enumerate(shape):
            for col_idx, cell in enumerate(row):
                if cell:
                    board_x = x + col_idx
                    board_y = y + row_idx
                    if board_x < 0 or board_x >= BOARD_WIDTH:
                        return True
                    if board_y >= BOARD_HEIGHT:
                        return True
                    if board_y >= 0 and self.board[board_y][board_x]:
                        return True
        return False
    
    def lock_piece(self):
        """Lock the current piece onto the board"""
        for row_idx, row in enumerate(self.current_piece['shape']):
            for col_idx, cell in enumerate(row):
                if cell:
                    board_y = self.current_pos['y'] + row_idx
                    board_x = self.current_pos['x'] + col_idx
                    if board_y >= 0:
                        self.board[board_y][board_x] = self.current_piece['color']
    
    def clear_lines(self):
        """Clear completed lines and update score"""
        lines_to_clear = []
        for y in range(BOARD_HEIGHT):
            if all(self.board[y]):
                lines_to_clear.append(y)
        
        for y in lines_to_clear:
            del self.board[y]
            self.board.insert(0, [0] * BOARD_WIDTH)
        
        self.lines_cleared += len(lines_to_clear)
        self.score += len(lines_to_clear) * 100 * self.level
        self.level = self.lines_cleared // 10 + 1
        
        return len(lines_to_clear)
    
    def drop(self):
        """Move piece down one row"""
        if not self.check_collision(self.current_pos['x'], self.current_pos['y'] + 1, self.current_piece['shape']):
            self.current_pos['y'] += 1
            return True
        return False
    
    def hard_drop(self):
        """Drop piece to bottom immediately"""
        while self.drop():
            pass
        self.lock_piece()
        self.clear_lines()
        self.spawn_next_piece()
    
    def move(self, dx, dy):
        """Move piece horizontally or vertically"""
        if not self.check_collision(self.current_pos['x'] + dx, self.current_pos['y'] + dy, self.current_piece['shape']):
            self.current_pos['x'] += dx
            self.current_pos['y'] += dy
    
    def rotate(self):
        """Rotate piece clockwise"""
        new_shape = rotate_piece(self.current_piece['shape'])
        if not self.check_collision(self.current_pos['x'], self.current_pos['y'], new_shape):
            self.current_piece['shape'] = new_shape
        else:
            # Wall kick - try moving left/right
            for offset in [1, -1, 2, -2]:
                if not self.check_collision(self.current_pos['x'] + offset, self.current_pos['y'], new_shape):
                    self.current_pos['x'] += offset
                    self.current_piece['shape'] = new_shape
                    return
    
    def get_piece_cells(self):
        """Get list of (x, y, color) for current piece"""
        cells = []
        for row_idx, row in enumerate(self.current_piece['shape']):
            for col_idx, cell in enumerate(row):
                if cell:
                    cells.append((
                        self.current_pos['x'] + col_idx,
                        self.current_pos['y'] + row_idx,
                        self.current_piece['color']
                    ))
        return cells

def draw_board(stdscr, game):
    """Draw the game board"""
    stdscr.clear()
    
    # Draw border
    for y in range(BOARD_HEIGHT + 2):
        stdscr.addstr(y, 0, '|')
        stdscr.addstr(y, BOARD_WIDTH + 1, '|')
    for x in range(BOARD_WIDTH + 2):
        stdscr.addstr(0, x, '-')
        stdscr.addstr(BOARD_HEIGHT + 1, x, '-')
    
    # Draw locked pieces
    for y in range(BOARD_HEIGHT):
        for x in range(BOARD_WIDTH):
            if game.board[y][x]:
                stdscr.addstr(y + 1, x + 1, '[]', curses.color_pair(game.board[y][x]))
    
    # Draw current piece
    for x, y, color in game.get_piece_cells():
        stdscr.addstr(y + 1, x + 1, '[]', curses.color_pair(color))
    
    # Draw score and level
    info_y = BOARD_HEIGHT + 3
    stdscr.addstr(info_y, 2, f'Score: {game.score}')
    stdscr.addstr(info_y + 1, 2, f'Level: {game.level}')
    stdscr.addstr(info_y + 2, 2, f'Lines: {game.lines_cleared}')
    
    # Draw next piece preview
    next_y = BOARD_HEIGHT + 3
    next_x = BOARD_WIDTH + 4
    stdscr.addstr(next_y, next_x, 'Next:')
    for row_idx, row in enumerate(game.next_piece['shape']):
        for col_idx, cell in enumerate(row):
            if cell:
                stdscr.addstr(next_y + row_idx + 1, next_x + col_idx * 2, '[]', 
                            curses.color_pair(game.next_piece['color']))
    
    # Draw controls
    controls_y = BOARD_HEIGHT + 10
    stdscr.addstr(controls_y, 2, 'Controls:')
    stdscr.addstr(controls_y + 1, 2, '← → : Move')
    stdscr.addstr(controls_y + 2, 2, '↑ : Hard Drop')
    stdscr.addstr(controls_y + 3, 2, 'a/d : Rotate')
    stdscr.addstr(controls_y + 4, 2, 'p : Pause')
    stdscr.addstr(controls_y + 5, 2, 'q : Quit')
    
    if game.game_over:
        stdscr.addstr(BOARD_HEIGHT // 2, BOARD_WIDTH // 2 - 10, 'GAME OVER!', curses.A_BOLD)
    
    if game.paused:
        stdscr.addstr(BOARD_HEIGHT // 2, BOARD_WIDTH // 2 - 8, 'PAUSED', curses.A_BOLD)
    
    stdscr.refresh()

def main(stdscr):
    """Main game loop"""
    # Setup curses
    stdscr.keypad(True)
    curses.curs_set(0)
    curses.cbreak()
    stdscr.nodelay(True)
    stdscr.timeout(50)
    
    # Initialize colors
    curses.start_color()
    curses.use_default_colors()
    curses.init_pair(1, curses.COLOR_RED, -1)
    curses.init_pair(2, curses.COLOR_CYAN, -1)
    curses.init_pair(3, curses.COLOR_YELLOW, -1)
    curses.init_pair(4, curses.COLOR_GREEN, -1)
    curses.init_pair(5, curses.COLOR_MAGENTA, -1)
    curses.init_pair(6, curses.COLOR_WHITE, -1)
    curses.init_pair(7, curses.COLOR_RED, -1)
    
    # Create game
    game = TetrisGame()
    last_drop_time = time.time()
    
    while True:
        draw_board(stdscr, game)
        
        # Handle input
        key = stdscr.getch()
        
        if key == ord('q'):
            break
        
        if key == ord('p'):
            game.paused = not game.paused
        
        if game.paused or game.game_over:
            continue
        
        # Soft drop time
        current_time = time.time()
        drop_speed = max(0.1, INITIAL_SPEED - (game.level - 1) * SPEED_INCREMENT)
        
        if current_time - last_drop_time > drop_speed:
            if game.drop():
                last_drop_time = current_time
            else:
                game.lock_piece()
                game.clear_lines()
                game.spawn_next_piece()
                last_drop_time = current_time
        
        if key == curses.KEY_LEFT:
            game.move(-1, 0)
        elif key == curses.KEY_RIGHT:
            game.move(1, 0)
        elif key == curses.KEY_UP:
            game.hard_drop()
        elif key == ord('a') or key == ord('A'):
            game.rotate()
        elif key == ord('d') or key == ord('D'):
            game.rotate()
        
        if game.game_over:
            draw_board(stdscr, game)
            stdscr.nodelay(False)
            stdscr.timeout(1000)
            stdscr.addstr(BOARD_HEIGHT // 2 + 2, BOARD_WIDTH // 2 - 10, 
                         'Press any key to restart')
            stdscr.getch()
            game.reset()
            stdscr.nodelay(True)
            stdscr.timeout(50)

if __name__ == '__main__':
    try:
        curses.wrapper(main)
    except:
        pass
