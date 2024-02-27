  import React, { useState } from 'react'
  import '../styles/TimelineEvent.css'

  import { useNavigate } from 'react-router-dom';

  function EventRangeGraphic({bracketWidth, leftOffset, heightOffset, isClicked}) {

    return (
      <div 
        className='event-range' 
        style={{left: leftOffset, 
                width: bracketWidth,
                bottom: `${heightOffset}vh`,
                borderColor: isClicked ? `#FFBE0B` : `#338`,
                zIndex: isClicked ? 3 : 0,
              }}/>
    )
  }
  

  // TODO:
  // make range graphic
    // use an svg and scale it?
  // figure out how to stop overlap stuff
  // get ticks to display times other than years
  export default function TimelineEvent({layer, ev, offsets, timelineWidth, rangeHeight}) {

    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
        setClicked(!clicked);
    }

    if (!offsets) {
      return null
    }

    // get event offset pixel values
    let e1Offset = offsets[0] * timelineWidth - 17
    const e2Offset = offsets[1] * timelineWidth - 17

    
    e1Offset = e1Offset < 0 ? 0 : e1Offset
    const rangeWidth = e2Offset - e1Offset

    // determine if range to display

    if (!ev.isRange()) {

        return (
            <div className='timeline-event-container' >
                <div
                    className={`event-button ${clicked ? 'clicked' : ''}`}
                    style={{left: `${e1Offset}px`}}
                    onClick={handleClick}
                >   
                    {clicked && (
                        <button className='event-name' onClick={() => window.open(`/markdown/${ev.parent}/${ev.fileName}`, '_blank')}>
                          <div>{ev.eventName}</div>
                          <div>{ev.startDate.year}</div>
                            
                        </button>
                    )}
                    {!clicked && (
                        <div className='event-line'/>
                    )}

                </div>
            </div>
        )



    } else {
      return (
        <div className='timeline-event-container' style={{ zIndex: clicked ? 3 : 1 }}>
          <div className='range-button-container' style={{top: `-${rangeHeight+4}vh`}}>
            <div
                className={`event-button ${clicked ? 'clicked' : ''}`}
                style={{left: `${((e2Offset + e1Offset) / 2) - 8}px`}}
                onClick={handleClick}
            >   
                {clicked && (
                    <button className='event-name' onClick={() => window.open(`/markdown/${ev.parent}/${ev.fileName}`, '_blank')}>
                        <div >{ev.eventName}</div>
                        <div >{ev.startDate.year} to {ev.endDate.year}</div>
                    </button>
                )}


                
            </div>
          </div>
          
          <EventRangeGraphic 
            bracketWidth={rangeWidth} 
            leftOffset={e1Offset}
            heightOffset={rangeHeight + 14.5}
            isClicked={clicked}
          />
        </div>
      )
    }
}