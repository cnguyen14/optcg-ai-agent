# One Piece Card Game — Comprehensive Rules

## Overview

The One Piece Card Game (OPTCG) is a competitive trading card game where two players battle using decks built around a Leader card. The goal is to reduce your opponent's Life to zero and then land a final attack on their Leader.

## Card Types

### Leader Card
- Placed face-up in the Leader area at the start of the game
- Has a Life value (typically 4 or 5) that determines starting Life cards
- Has one or more colors that define your deck's color identity
- Has Power that determines combat strength
- Can attack and be attacked
- Is never KO'd — when attacked successfully with 0 Life, you lose

### Character Cards
- Played from hand by paying their cost in DON!!
- Placed in the Character area (your field)
- Enter play in the active (upright) position
- Can attack and be attacked when rested (sideways)
- Are KO'd (sent to trash) when an attack against them succeeds
- You may have up to 5 Characters on your field at once

### Event Cards
- Played from hand by paying their cost in DON!!
- Resolve their effect immediately
- Go to the trash after resolution
- Cannot be placed on the field

### Stage Cards
- Played from hand by paying their cost in DON!!
- Placed in the Stage area
- Remain on the field and provide ongoing effects
- You can only have 1 Stage card on your field
- Playing a new Stage sends the old one to trash

### DON!! Cards
- 10 DON!! cards in a separate DON!! deck
- Act as your resource/mana system
- 2 are added to your cost area each turn (1 on the very first turn)
- Can be rested to pay costs
- Can be attached to Characters or Leader for +1000 power each (until end of turn)
- Return to cost area during your Refresh Phase

## Game Zones

- **Leader Area**: Your Leader card
- **Character Area**: Your Characters in play (max 5)
- **Cost Area / DON!! Area**: Your available DON!! for paying costs
- **Stage Area**: Your active Stage card (max 1)
- **Life Area**: Face-down Life cards
- **Hand**: Cards you can play or use for Counter
- **Deck**: Face-down draw pile
- **DON!! Deck**: Separate pile for DON!! cards
- **Trash**: Discarded, KO'd, and used cards (face-up, public information)

## Turn Structure (Detailed)

### 1. Refresh Phase
- Set all your rested (sideways) cards to active (upright) position
- This includes: Leader, Characters, DON!! in cost area
- DON!! attached to cards return to your cost area (and become active)

### 2. Draw Phase
- Draw 1 card from the top of your deck
- **Exception**: The first player skips this on their very first turn
- If you cannot draw and are required to, you lose the game

### 3. DON!! Phase
- Place the top 2 cards of your DON!! deck into your cost area in the active position
- On the very first turn of the game (first player, first turn), add only 1 DON!!
- Once the DON!! deck is empty, no more are added

### 4. Main Phase
During your Main Phase, you may do any of the following in any order and any number of times:

**Play a card**: Pay its cost by resting DON!! from your cost area, then place it.
**Attach DON!!**: Move active DON!! from your cost area to a Character or Leader. Each DON!! gives +1000 power until end of turn.
**Attack**: Rest an active Character or Leader to declare an attack (see Battle section).
**Activate [Main] effects**: Some cards have effects that activate during your Main Phase.

### 5. End Phase
- "End of turn" effects resolve
- Turn passes to opponent

## Battle System (Detailed)

### Declaring an Attack
1. Choose an active (upright) Character or your Leader as the attacker
2. Rest (turn sideways) the attacker
3. Choose a valid target:
   - Opponent's Leader (always a valid target)
   - Opponent's rested (sideways) Character
   - **You cannot attack active Characters**

### Counter Step
After the attack is declared, before damage is resolved:

1. The defending player may activate **Counter** abilities
2. Counter cards in hand show a Counter value (+1000 or +2000)
3. The defending player may place Counter cards from hand into trash to add their Counter value to the defending card's power
4. Some cards have [Counter] effects that activate additional abilities
5. Both players may activate triggered effects in response

### Damage Step
1. Compare the attacker's power to the defender's power
2. If attacker's power ≥ defender's power: **Attack succeeds**
3. If attacker's power < defender's power: **Attack fails** (no effect)

### Results of a Successful Attack
- **Against Leader**: The defending player takes 1 damage — they move the top card of their Life to their hand
- **Against Character**: The Character is **KO'd** — it goes to the trash
- If the defending player's Leader is attacked successfully while they have **0 Life cards remaining**, that player **loses the game**

## Winning the Game
- You win when your opponent's Leader is attacked successfully and they have 0 Life cards
- Your opponent loses if they must draw a card and cannot (empty deck)

## Deck Construction Rules

### Required
- **Exactly 1 Leader card** (not part of the 50-card deck)
- **Exactly 50 cards** in the main deck
- **10 DON!! cards** in the DON!! deck (standard, not customizable)

### Restrictions
- **Maximum 4 copies** of any card (identified by card number, e.g., OP01-001)
- **Color identity**: Every card in your deck must match your Leader's color(s)
  - If your Leader is Red, you can only include Red cards
  - If your Leader is Red/Green (dual color), you can include Red cards, Green cards, and Red/Green cards
  - A multi-color card must have ALL its colors within the Leader's colors

### Tournament Rules
- Best of 1 or Best of 3 depending on tournament format
- 30-minute time limit per match
- No sideboard in standard format

## Special Timing Rules

### [On Play] Effects
Activate when the card is placed on the field from your hand by paying its cost.

### [When Attacking] Effects
Activate when the card is declared as an attacker and rested.

### [On K.O.] Effects
Activate when the card is KO'd and sent to the trash.

### [End of Your Turn] Effects
Activate during the End Phase of your turn.

### [On Your Opponent's Attack] Effects
Activate when your opponent declares an attack.

### [Activate: Main] Effects
Can be activated during your Main Phase as an action (usually once per turn).

### [Trigger] Effects
When a Life card is added to your hand due to taking damage, if that card has a Trigger effect, you may activate it for free (without paying cost). This applies to Character, Event, and Stage cards.

### Don!! x[N] Effects
These effects activate only if the Character or Leader has at least N DON!! cards attached to it.
