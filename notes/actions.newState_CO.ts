//* ACTIONS


function moveAction(oldState: Gamestate, currentPlayerID: Player['id'], location: Source['name']): Gamestate {
  //? update to one function with conditions to incorporate logon and off? (add card disposal mechanic) 
  const newState: Gamestate = 
  {
    ...oldState,
    players : oldState.players
      .map((player) => player.id === currentPlayerID ?
          { ...player, currentSource : location } :
          player
      ),
    turnMovesLeft : oldState.turnMovesLeft - 1 
  };
  //? encapsulate below into nextMove check?
  if (newState.turnMovesLeft > 0) {
    return updatePossibleActions(newState, currentPlayerID)
  } else {
    //? trigger next turn? -> another function
    return newState;
  }
}


function clearMisinfo(oldState: Gamestate, currentPlayerID: Player['id'], misinfoType: Misinformation['name'], location: Source['name']): Gamestate {
  const sourceIndex: number = oldState.sources.map((source) => source.name).indexOf(location);
  // default markers to remove to 1, and update if debunked 
  let noOfMarkers: number = 1;
  // check if any colours/misinformations have been debunked
  if (oldState.misinformation[misinfoType].debunked) {
    noOfMarkers = oldState.sources[sourceIndex][`markers_${misinfoType}`]
  };
  const newState: Gamestate = 
  {
    ...oldState,
    sources : oldState.sources
      .map((source) => source.name === location ?
          { ...source, [`markers_${misinfoType}`] : source[`markers_${misinfoType}`] - noOfMarkers } :
          source
      ),
    misinformation: {
      ...oldState.misinformation,
      [misinfoType] : {
        ...oldState.misinformation[misinfoType],
        markersLeft : oldState.misinformation[misinfoType].markersLeft + noOfMarkers
      }
    },
    turnMovesLeft : oldState.turnMovesLeft - 1 
  };
  if (newState.turnMovesLeft > 0) {
    return updatePossibleActions(newState, currentPlayerID)
  } else {
    //? trigger next turn? -> another function
    return newState;
  }
}


function shareCard(oldState: Gamestate, currentPlayerID: Player['id'], recipient: Player['id'], sharedCard: Card['sourceName']): Gamestate {
  // remove card from player hand
  // put card in recipient hand
  const newState: Gamestate = 
  {
    ...oldState,
    players : oldState.players
      .map((player) => player.id === currentPlayerID ?
          { 
            ...player, 
            cards : player.cards.filter((card) => card.sourceName !== sharedCard) 
          } :
            player.id === recipient ?
              { 
                ...player, 
                cards : [...player.cards, {
                  cardType: 'connection',
                  sourceName: sharedCard,
                  misinfoType: null
                }] 
              } :
                player
      ),
    turnMovesLeft : oldState.turnMovesLeft - 1
  };
  if (newState.turnMovesLeft > 0) {
    return updatePossibleActions(newState, currentPlayerID)
  } else {
    //? trigger next turn? -> another function
    return newState;
  }
}


//* Logon action / Logoff action
//! these actions are identical, but will be passed different card (matching destination location for logon, and players current location for logoff)

//? called as event handler, will be passed player, location, and card)

function logOnOff(oldState: Gamestate, currentPlayerID: Player['id'], location: Source['name'], usedCard: Card['sourceName']): Gamestate {
  // remove card from player hand
  // set players location to "location"
  const newState: Gamestate = 
  {
    ...oldState,
    players : oldState.players
      .map((player) => player.id === currentPlayerID ?
          { 
            ...player, 
            currentSource : location, 
            cards : player.cards.filter((card) => card.sourceName !== usedCard)
          } :
          player
      ),
    turnMovesLeft : oldState.turnMovesLeft - 1 
  };
  if (newState.turnMovesLeft > 0) {
    return updatePossibleActions(newState, currentPlayerID)
  } else {
    //? trigger next turn? -> another function
    return newState;
  } 
}

//* TURN

function updatePossibleActions(oldState: Gamestate, currentPlayerID: Player['id']): Gamestate {
  //* settup
  const playerIndex: number = oldState.players.map((player) => player.id).indexOf(currentPlayerID);
  const location: Player['currentSource'] = oldState.players[playerIndex].currentSource;
  const sourceIndex: number = oldState.sources.map((source) => source.name).indexOf(location);
  //* move check
  const adjacents: string[] = connections[location]; //! this may be changed relative to the sources/connections object
  //* clear checks
  const clearCommunityMisinfo: boolean = oldState.sources[sourceIndex].markers_community > 0;
  const clearSocialMisinfo: boolean = oldState.sources[sourceIndex].markers_social > 0;
  const clearRelationsMisinfo: boolean = oldState.sources[sourceIndex].markers_relations > 0;
  //* share checks
  // check if cards in hand
  let possibleShares: Player[] = [];
  if (oldState.players[playerIndex].cards.length > 0) {
    // check if another player is there
    const otherPlayers: Player[] = oldState
      .players
      .filter((player) => player.id !== currentPlayerID)
      .filter((otherPlayer) => otherPlayer.currentSource === location);
    // check players have space in their hand
    possibleShares = otherPlayers
      .filter((player) => player.cards.length < 6)
  }
  //* logoff checks
  // check hand contains current location card
  const logoffPossible: boolean = oldState.players[playerIndex].cards
  .filter((card) => card.sourceName === location)
  .length > 0;
  //* logon check
  // check hand contains other location card
  const logonPossible: Card['sourceName'][] = oldState.players[playerIndex].cards
  .map((card) => card.sourceName)
  .filter((name) => name !== location);
  //* debunk checks
  // check if we are at home (debunk 1/2)
  const atHome: boolean = location === 'crazy dave';
  // check hand contains 4 of any misinfo type/area (debunk 2/2)
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
  //* UPDATE ENTIRE STATE WITH ALL ABOVE CHANGES
  const newState: Gamestate = 
  {
    ...oldState,
    sources : oldState.sources
      .map((source) => source.name === location ?
          { ...source, 
            canMove : false,
            canLogOn: false,
            canLogOff: false,
            canClearCommunity: clearCommunityMisinfo,
            canClearSocial: clearSocialMisinfo,
            canClearRelations: clearRelationsMisinfo,
            canShare: possibleShares,
            canDebunk: debunkable,
          } :
          { ...source, 
            canMove : adjacents.includes(source.name),
            canLogOn: logonPossible.includes(source.name),
            canLogOff: logoffPossible,
            canClearCommunity: clearCommunityMisinfo,
            canClearSocial: clearSocialMisinfo,
            canClearRelations: clearRelationsMisinfo,
            canShare: [],
            canDebunk: [],
          }
      ),
  };
  return newState;
}

//* HELPERS

//find next player (using id and turn array)
//find next player (using id and turn array)


//* RESOURCES

//? will be in format { sourceName : [array of source names] }
const connections: Connections = {
  source01: [],
  source02: [],
  source03: [],
  source04: [],
  source05: [],
  source06: [],
  source07: [],
  source08: [],
  source09: [],
  source10: [],
  source11: [],
  source12: [],
  source13: [],
  source14: [],
  source15: [],
  source16: [],
  source17: [],
  source18: [],
  source19: [],
  source20: [],
  source21: [],
  source22: [],
  source23: [],
  source24: [],
}