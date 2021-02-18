import { Gamestate, Card,ViralCard, Source, Player, Misinformation } from '../types/gameStateTypes'
import { didWin,typeCheck } from './setup'
import { connections as sources } from './connections'


export const messages:string[]=[]
//* START THE GAME
//? called when start button pressed, after game initialised and player order set

export function startGame(oldState: Gamestate) {
  const currentPlayerID: Player['id'] = oldState.players[0].id;
  let playerName:string=oldState.players.filter(player=>player.id===currentPlayerID)[0].name
  if(messages.length===0){messages.push(`Welcome ${playerName}! Time to travel around the map cleaning up misinformation around town. Good Luck!`)}

  return updatePossibleActions(oldState, currentPlayerID);
}

//* ACTIONS

export function moveAction(oldState: Gamestate, currentPlayerID: Player['id'], location: Source['name']): Gamestate {
  const newState: Gamestate =
  {
    ...oldState,
    players: oldState.players
      .map((player) => player.id === currentPlayerID ?
        { ...player, currentSource: location } :
        player
      ),
    turnMovesLeft: oldState.turnMovesLeft - 1,
  };

  let playerName:string=oldState.players.filter(player=>player.id===currentPlayerID)[0].name

  messages.push(`${playerName} moved to "${location}"`)
  messages.push(`${playerName} has ${newState.turnMovesLeft} moves left`)
  return nextMoveChecker(newState, currentPlayerID);
}


export function clearMisinfo(oldState: Gamestate, currentPlayerID: Player['id'], misinfoType: Misinformation['name'], location: Source['name']): Gamestate {
  const sourceIndex: number = oldState.sources.map((source) => source.name).indexOf(location);
  console.log('old state in clearmisinfo', oldState)
  let noOfMarkers: number = 1;
  if (oldState.misinformation[misinfoType].debunked) {
    noOfMarkers = oldState.sources[sourceIndex][`markers_${misinfoType}`]
  };
  const newState: Gamestate =
  {
    ...oldState,
    sources: oldState.sources
      .map((source) => source.name === location ?
        { ...source, [`markers_${misinfoType}`]: source[`markers_${misinfoType}`] - noOfMarkers } :
        source
      ),
    misinformation: {
      ...oldState.misinformation,
      [misinfoType]: {
        ...oldState.misinformation[misinfoType],
        markersLeft: oldState.misinformation[misinfoType].markersLeft + noOfMarkers
      }
    },
    turnMovesLeft: oldState.turnMovesLeft - 1,
  };

  let playerName:string=oldState.players.filter(player=>player.id===currentPlayerID)[0].name

  messages.push(`${playerName} cleared ${noOfMarkers} bit of ${misinfoType} misinformation from ${location}`)
  messages.push(`${playerName} has ${newState.turnMovesLeft} moves left`)

  console.log('player cleared', noOfMarkers, misinfoType);

  return nextMoveChecker(newState, currentPlayerID);
}


export function shareCard(oldState: Gamestate, currentPlayerID: Player['id'], recipient: Player['id'], sharedCard: Card['sourceName']): Gamestate {

  const playerIndex = oldState.players
    .map((player) => player.id)
    .indexOf(currentPlayerID);
  const cardMisinfoValue = oldState.players[playerIndex].cards
    .filter((card) => card.sourceName === sharedCard)[0].misinfoType;


  const newState: Gamestate =
  {
    ...oldState,
    players: oldState.players
      .map((player) => player.id === currentPlayerID ?
        {
          ...player,
          cards: player.cards.filter((card) => card.sourceName !== sharedCard)
        } :
        player.id === recipient ?
          {
            ...player,
            cards: [...player.cards, {
              cardType: 'connection',
              sourceName: sharedCard,
              misinfoType: cardMisinfoValue
            }],
          } :
          player
      ),
    turnMovesLeft: oldState.turnMovesLeft - 1,
  };
  console.log('player shared', sharedCard, 'with player', recipient);
  console.log(`%c there are ${newState.turnMovesLeft} moves left`,`background-color: lightpink; color: black; padding: 10px`);
  return nextMoveChecker(newState, currentPlayerID);
}


export function logOnOff(oldState: Gamestate, currentPlayerID: Player['id'], location: Source['name'], usedCard: Card['sourceName']): Gamestate {
  const newState: Gamestate =
  {
    ...oldState,
    players: oldState.players
      .map((player) => player.id === currentPlayerID ?
        {
          ...player,
          currentSource: location,
          cards: player.cards.filter((card) => card.sourceName !== usedCard)
        } :
        player
      ),
    turnMovesLeft: oldState.turnMovesLeft - 1,
  };

  let playerName:string=oldState.players.filter(player=>player.id===currentPlayerID)[0].name
  messages.push(`${playerName} fast traveled to "${location}" using their "${usedCard}" card`)
  messages.push(`${playerName} has ${newState.turnMovesLeft} moves left`)
  
  return nextMoveChecker(newState, currentPlayerID);
}


export function debunkMisinfo(oldState: Gamestate, currentPlayerID: Player['id'], usedCards: Card['sourceName'][], misinfoType: Misinformation['name']): Gamestate {
  const newState: Gamestate =
  {
    ...oldState,
    players: oldState.players
      .map((player) => player.id === currentPlayerID ?
        {
          ...player,
          cards: player.cards.filter((card) => !usedCards.includes(card.sourceName))
        } :
        player
      ),
    misinformation: {
      ...oldState.misinformation,
      [misinfoType]: {
        ...oldState.misinformation[misinfoType],
        debunked: true,
      }
    },
    turnMovesLeft: oldState.turnMovesLeft - 1,
  }
  if (didWin(newState)) {
    console.log(`%c CONGRATULATIONS! You debunked all the misinformation in the world and won. Good for you.`,`background-color: chartreuse; color: indianred; padding: 10px; font-weight: bold`);
    return {
      ...newState,
      gameWon: true,
    }
  } else {
    console.log('player debunked', misinfoType);
    console.log(`%c there are ${newState.turnMovesLeft} moves left`,`background-color: lightpink; color: black; padding: 10px`);
    return nextMoveChecker(newState, currentPlayerID)
  }
}


//* TURN

export function updatePossibleActions(oldState: Gamestate, currentPlayerID: Player['id']): Gamestate {
  //* settup
  const playerIndex: number = oldState.players.map((player) => player.id).indexOf(currentPlayerID);
  const location: Player['currentSource'] = oldState.players[playerIndex].currentSource;
  const sourceIndex: number = oldState.sources.map((source) => source.name).indexOf(location);
  //* move check
  const adjacents: string[] = sources.filter((source) => source.name === location)[0].connections;
  //* clear checks
  const clearCommunityMisinfo: boolean = oldState.sources[sourceIndex].markers_community > 0;
  const clearSocialMisinfo: boolean = oldState.sources[sourceIndex].markers_social > 0;
  const clearRelationsMisinfo: boolean = oldState.sources[sourceIndex].markers_relations > 0;
  //* share checks
  // check if cards in hand
  let possibleShares: Player[] = [];
  if (oldState.players[playerIndex].cards.length > 0) {
    
    const otherPlayers: Player[] = oldState
      .players
      .filter((player) => player.id !== currentPlayerID)
      .filter((otherPlayer) => otherPlayer.currentSource === location);
    
    possibleShares = otherPlayers
      .filter((player) => player.cards.length < 6)
  }
  //* logoff checks
  // check hand contains current location card
  const logoffPossible: boolean = oldState.players[playerIndex].cards
    .filter((card) => card.sourceName === location)
    .length > 0;
  //* logon check
  
  const logonPossible: Card['sourceName'][] = oldState.players[playerIndex].cards
    .map((card) => card.sourceName)
    .filter((name) => name !== location);
  //* debunk checks
 
  const atHome: boolean = location === 'crazy dave';
  
  const debunkable: Misinformation['name'][] = []
  if (atHome) {
    if (
      oldState.players[playerIndex].cards
        .filter((card) => card.misinfoType === 'community')
        .length >= 4) {
      debunkable.push('community')
    };
    if (
      oldState.players[playerIndex].cards
        .filter((card) => card.misinfoType === 'social')
        .length >= 4) {
      debunkable.push('social')
    };
    if (
      oldState.players[playerIndex].cards
        .filter((card) => card.misinfoType === 'relations')
        .length >= 4) {
      debunkable.push('relations')
    };
  };
  
  const newState: Gamestate =
  {
    ...oldState,
    sources: oldState.sources
      .map((source) => source.name === location ?
        {
          ...source,
          canMove: false,
          canLogOn: false,
          canLogOff: false,
          canClearCommunity: clearCommunityMisinfo,
          canClearSocial: clearSocialMisinfo,
          canClearRelations: clearRelationsMisinfo,
          canShare: possibleShares,
          canDebunk: debunkable,
        } :
        {
          ...source,
          canMove: adjacents.includes(source.name),
          canLogOn: logonPossible.includes(source.name) && !adjacents.includes(source.name),
          canLogOff: logoffPossible && !adjacents.includes(source.name),
          canClearCommunity: false,
          canClearSocial: false,
          canClearRelations: false,
          canShare: [],
          canDebunk: [],
        }
      ),
  };
  console.log('spreadlevel',newState)
  return newState;
}


export function boardActions(oldState: Gamestate, currentPlayerID: Player['id'], noOfCards: number): Gamestate {
  // deal connection cards
 
  let cardsLeft = noOfCards;

  let newState: Gamestate = oldState;
  while (cardsLeft > 0) {
    console.log('Cards Left',cardsLeft)
    didLose(newState)
    console.log('before deal connection',newState)
    newState = dealConnectionCard(newState);
    console.log('after deal connection',newState)
    cardsLeft--;
  }
  //? do we need to put breaks here, and how, for the front end to update or show when a card has been dealt?
  // check spread marker for weight
  // deal misinfo cards
  let misinfoCardNo = [2, 2, 3, 4][newState.spreadLevel];
  while (misinfoCardNo > 0) {
    newState = dealMisinfoCard(newState, 1, false)!
    
    didLose(newState)
     
    misinfoCardNo--
  }
  console.log('spreadLevel',newState)
  return nextTurn(newState, currentPlayerID)
}

//* HELPERS

export function nextTurn(oldState: Gamestate, currentPlayerID: Player['id']): Gamestate {
  if(oldState.players.length>1){
  const playerIndex: number = oldState.players.map((player) => player.id).indexOf(currentPlayerID);
  const nextPlayerIndex: number = playerIndex === oldState.players.length - 1 ?
    0 :
    playerIndex + 1;
  const newState: Gamestate =
  {
    ...oldState,
    players: oldState.players
      .map((player, index) => index === playerIndex ?
        { ...player, isCurrent: false } :
        index === nextPlayerIndex ?
          { ...player, isCurrent: true } :
          player
      ),
    // reset number of moves
    turnMovesLeft: 4,
  };console.log(`%c NEXT PLAYERS TURN`,`background-color: lightgreen; color: black; padding: 10px`);
  
  messages.push(`Now it's over to ${oldState.players[nextPlayerIndex].name}!`)
  console.log('spreadlevel', newState)
  return updatePossibleActions(newState, newState.players[nextPlayerIndex].id)
}
  const newState= {
    ...oldState,
    turnMovesLeft: 4,
  };
  console.log('spreadlevel', newState)
  return updatePossibleActions(newState,currentPlayerID)
}


export function nextMoveChecker(oldState: Gamestate, currentPlayerID: Player['id']): Gamestate {
  if (oldState.turnMovesLeft > 0) {
    return updatePossibleActions(oldState, currentPlayerID)
  } else {

    return boardActions(oldState, currentPlayerID, 2)
  }
}


// called when player has chosen to discard card from hand, when cardHandOverflow === true
export function discardCard(oldState: Gamestate, currentPlayerID: Player['id'], discardedCard: Card['sourceName']): Gamestate {
  const newState: Gamestate =
  {
    ...oldState,
    players: oldState.players
      .map((player) => player.id === currentPlayerID ?
        {
          ...player,
          cards: player.cards.filter((card) => card.sourceName !== discardedCard),
          cardHandOverflow: false,
        } :
        player
      ),
  };
  //? calling boardActions with newState.dealHistory will decrement the amount of connection cards to be dealt, allowing the function to continue where it left off
  return boardActions(newState, currentPlayerID, newState.dealHistory)
}


export function outbreak(outbreak_source: Source, oldState: Gamestate, from:string) {
  let playerName:string=oldState.players.filter(player=>player.isCurrent)[0].name
  oldState.chaosMeter++
  messages.push(`Oh no ${playerName}! We've had an outbreak at ${outbreak_source.name}!! Chaos meter increases to ${oldState.chaosMeter*25}%`)
  
  didLose(oldState)
  let connections!: string[];
  for (const source of sources) {
    if (source.name === outbreak_source.name) {
      connections = source.connections  //* set list of connections to spread to
    }
  }
  for (const connection of connections) {
    for (const source of oldState.sources) {
      if (source.name === connection) {
        let key = `markers_${outbreak_source.misinfoType}`
        console.log('source we outbreak to',source)
        console.log('source we outbreak from',outbreak_source)
        if (typeCheck(key))
          if (source[key] === 3 && source.name!==from) {
            oldState = outbreak(source, oldState,outbreak_source.name)
          }
          else {
            source[key]++
            didLose(oldState)
          }

      }
    }
  }
  let newState = { ...oldState }
  return newState
}

export function viralCheck(object: any): object is ViralCard {
  return false
}

export function dealConnectionCard(oldState: Gamestate) {
  
  let newCard: Card|ViralCard = oldState.connectionDeck[0]
  if(newCard===undefined){
    oldState.gameLost=true
    let newState = { ...oldState }
    console.log('game lost',newState)
    return newState
  }
  if (newCard.cardType==='viral') {
    oldState = playViralCard(oldState)
    console.log("speadlevel", oldState.spreadLevel)
    oldState.connectionDeck.shift()
  }
  else {
    for (const player of oldState.players) {
      if (player.isCurrent) {
        if (!viralCheck(newCard)) {
          console.log('deal normal card', oldState)
          player.cards.push(newCard)
          oldState.connectionDeck.shift()
        }
      }
    }
  }

  let newState = { ...oldState }
  console.log('spreadlevel',newState)
  return newState
}

export function playViralCard(oldState: Gamestate) {
  oldState = dealMisinfoCard(oldState, 3, true)!
  oldState.spreadLevel++
  oldState.misinformationDeckActive = [...shuffle(oldState.misinformationDeckPassive), ...oldState.misinformationDeckActive]
  oldState.misinformationDeckPassive=[]
  let newState = { ...oldState }
  console.log('SPREADLEVEL SHOULD',newState)
  return newState
}

export function shuffle(array: any[]) {
  let currentIndex = array.length
  let tempValue
  let randomIndex

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1
    tempValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = tempValue
  }
  return array;
}

export function didLose(state: Gamestate) {

  //let playerName:string=state.players.filter(player=>player.isCurrent)[0].name
  if (state.chaosMeter === 4){
    //messages.push(`Oh no ${playerName},Chaos reigns!, the chaos meter is too high, so it's Game Over`)
    state.gameLost=true
    console.log(state)
    return true}
  if (
    state.misinformation.community.markersLeft <= 0 ||
    state.misinformation.social.markersLeft <= 0 ||
    state.misinformation.relations.markersLeft <= 0
  ){
    //messages.push(`Oh no ${playerName}! All your markers are gone, so it's Game Over`)
    console.log(state)
    state.gameLost=true
    return true}
  if (state.connectionDeck.length === 0|| state.misinformationDeckActive.length===0) {
    //messages.push(`Oh no ${playerName}! You have no there are no cards left to draw, it's Game over!`)
    console.log(state)
    state.gameLost=true
    return true
  }
  return false
}


export function dealMisinfoCard(oldState: Gamestate, weight: number, isViral: boolean) {
  didLose(oldState)
  let oldDeck: Card[] = oldState.misinformationDeckActive
  let drawSource: string
  if (isViral) {
    drawSource = oldDeck[oldDeck.length - 1].sourceName
    let playerName:string=oldState.players.filter(player=>player.isCurrent)[0].name //! WHY IS THIS HAPPENING ON 2ND PLAYER JOINING??
    messages.push(`Oh no ${playerName}! It's gone Viral at "${drawSource}"!`)
  }
  else {
    drawSource = oldDeck[0].sourceName
  }


  for (const source of oldState.sources) {

    if (source.name === drawSource) {

      while (weight > 0) {


        let key1 = 'markers_' + source.misinfoType
        let key2 = source.misinfoType

        if (typeCheck(key1) && typeCheck(key2)) {

          if (source[key1] === 3) {
            oldState = outbreak(source, oldState,'no')
          }
          else {
            source[key1]++
            oldState.misinformation[key2].markersLeft--
          }
          didLose(oldState)
          weight--
        }
      }

      if (isViral) {
        oldState.misinformationDeckPassive.push(oldDeck[oldDeck.length - 1])
        oldState.misinformationDeckActive.pop()
      }
      else {
        oldState.misinformationDeckPassive.push(oldDeck[0])
        oldState.misinformationDeckActive.shift()
      }
      let newState = { ...oldState }
      return newState
    }
  }
}