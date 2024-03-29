import config from "../config";
import { useParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Timeline from "../components/Timeline";
import "../styles/TimelineViewer.css"

export default function TimelineViewer() {

        const [timelineData, setTimelineData] = useState();
    
        const { timeline } = useParams();

        const navigate = useNavigate();
    
        // get name of parent folder
    
        // on mount, retrieve the Markdown file
        useEffect(() => {        
            const fetchTimeline = async () => {
                try {
                    const tlURL = config.backendBaseUrl + `serve/getTimeline/${timeline}`
                    const response = await fetch(tlURL);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${timeline} (status ${response.status})`);
                    }
    
                    const timelineJson = await response.json();
                    console.log(timelineJson)
                    setTimelineData(timelineJson)
    
                } catch (error) {
                    console.error('Error fetching Timeline file:', error.message);
                    
                    navigate('/error', { state: { errorMessage: error.message } });
                }
            };
    
            fetchTimeline();
        }, [timeline, navigate]);

        return (
            <>
                {timelineData ? <div className="timeline-title">{timelineData.timelineName}</div> : null}
                <Timeline data={timelineData}/>
            </>
            
        )
}