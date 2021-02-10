import React from 'react';
import "./CureDeck.scss"
import { useSelector } from 'react-redux'
import { RootState } from '../../redux/gameState/store';


import WifiIcon from '@material-ui/icons/Wifi';
import WifiOffIcon from '@material-ui/icons/WifiOff';



const style = {
  large: {
    fontSize:50
  }
}
export const CureDeck: React.FC = ():JSX.Element => {

  const gamestate = useSelector((state: RootState) => state.gameStateReducer)

  let misinformationCommunityHasDebunked = gamestate.misinformation.community.debunked
  let misinformationRelationsHasDebunked = gamestate.misinformation.relations.debunked
  let misinformationSocialHasDebunked = gamestate.misinformation.social.debunked

  let noCureString = "Not debunked yet - we're screwed"
  let cureString = "Debunked!! bitches!"
  const CureDeck = (<>
    <div className="debunk-indicator A">
      {misinformationCommunityHasDebunked ? <WifiOffIcon style={style.large}/> : <WifiIcon style={style.large}/> }</div>
    <div className="debunk-indicator B">
      {misinformationRelationsHasDebunked ? <WifiOffIcon style={style.large} /> : <WifiIcon style={style.large}/> }</div>
    <div className="debunk-indicator C">
      {misinformationSocialHasDebunked ? <WifiOffIcon style={style.large}/> : <WifiIcon style={style.large}/> }</div>
  </>)

  return (
    <div className="cure-deck-container" >
      {CureDeck}
    </div>
  )
}