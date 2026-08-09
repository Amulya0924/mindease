# Game: Tic-Tac-Toe (Two Player)

def play_game():
    # 1. Initialize Game Data using a List
    board = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] 
    #Three key variable
    current_player = "X" #variable tracks whose turn it is & flip b/n X & O 
    game_active = True #boolean variable used to control while loop. As long as this is true, game runs 
    moves_made = 0 #it tracks how many turns has passed, essential for determining if the game ends in draw(at 9 moves)

    print("--- Welcome to Tic-Tac-Toe ---")

    # 2. Main Game Loop
    while game_active: #ensures the game doesn't just run once and quit; it keeps asking for moves until the game is over.
        # Display the board
        print(f"\n {board[0]} | {board[1]} | {board[2]} ") #'f' tells to calculate/filled not print 
        print("-----------")
        print(f" {board[3]} | {board[4]} | {board[5]} ")
        print("-----------")
        print(f" {board[6]} | {board[7]} | {board[8]} \n")

        # 3. Handle User Input and Validation
        try:
            choice = input(f"Player {current_player}, choose a spot (1-9): ")
            index = int(choice) - 1 # Convert to list index

            # Check if input is within range and spot is not taken
            if index < 0 or index > 8: # to ensure player stays within boundaries, if not it will be "index error" 
                print("Invalid range! Please pick 1-9.")
                continue
            if board[index] == "X" or board[index] == "O": #to make sure a player cannot overwrite their opponent's mark
                print("That spot is already taken! Try again.")
                continue
        except ValueError: # prevents game from crashing if a player types "A" instead of number
            print("Invalid input! Please enter a number.")
            continue

        # 4. Update Board
        board[index] = current_player #takes the list index the player chose and replaces the number (like "5") with the player's symbol (either "X" or "O")
        moves_made += 1 # counts how many turns have passed

        # 5. Check for Win or Draw (Conditional Statements)
        #we use list of tuples for managing game data, Each tuple contains the three index positions that result in a win.
        win_conditions = [ #Defining the "Win Conditions"
            (0, 1, 2), (3, 4, 5), (6, 7, 8), # Rows (Horizontal)
            (0, 3, 6), (1, 4, 7), (2, 5, 8), # Columns (vertical)
            (0, 4, 8), (2, 4, 6)             # Diagonals
        ]

        winner_found = False #Before we check the board, we "assume" there is no winner yet.
        for condition in win_conditions: #It checks if the symbols at all three positions are identical (e.g., all are "X").
            if board[condition[0]] == board[condition[1]] == board[condition[2]]:
                winner_found = True #If the if statement finds three symbols in a row, it changes the flag from False to True.
                break

        if winner_found: #If they match, winner_found becomes True.
            print(f"\nCongratulations! Player {current_player} wins!")
            game_active = False # to stop the loop
        elif moves_made == 9:
            print("\nIt's a draw!")
            game_active = False
        else: #only runs if no winner was found and the board isn't full yet.
            # 6. Switch Players
            current_player = "O" if current_player == "X" else "X" #If the current_player is "X", change it to "O". If it is "O", change it back to "X".

    print("Game Over. Thanks for playing!")

# Run the game
if __name__ == "__main__": #This "if" statement acts like a security guard. It ensures the game only starts if you actually run this specific file, rather than importing it as a library into another project.
    play_game() #Function Call, tells Python to go back to the top where you defined def play_game(): and start running all the logic inside it.