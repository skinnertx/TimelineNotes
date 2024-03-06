import React, { useState } from "react";
import config from "../config";

export default function LoginPage() {

    const [userData, setUserData] = useState({
        username: '',
        password: ''
    })

    const [invalid, setInvalid] = useState(false)

    const [loggedIn, setLoggedIn] = useState(false)

    const handleChange = (e) => {
        setUserData({...userData, [e.target.name]: e.target.value})
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        const url = config.backendBaseUrl + 'login'

        const reqOps = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        }

        fetch(url, reqOps)
            .then(response => {
                if (!response.ok) {
                    if(response.status === 401) {
                        setInvalid(true)
                        throw new Error("invalid login")
                    } 
                    throw new Error(response.Error);
                }
                console.log('Request successful');
                setInvalid(false)
                return response.json();
            })
            .then(data => {
                console.log('Response data:', data);
                const token = data.token

                localStorage.setItem("token", token)
                console.log("stored token")
                setLoggedIn(true)
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });

        console.log('submitted: ', userData);
    }

    return (
        <div>
            {loggedIn ? 
                <div>logged in! you may now edit the database</div> 
                :
            <form onSubmit={handleSubmit}>
                <label htmlFor="username">Username:</label><br />
                <input
                    type="text"
                    id="username"
                    name="username"
                    value={userData.username}
                    onChange={handleChange}
                /><br/>

                <label htmlFor="password">Password:</label><br />
                <input
                    type="password"
                    id="password"
                    name="password"
                    value={userData.password}
                    onChange={handleChange}
                /><br />

                <button type="submit">Submit</button>
            </form>
            }
            {invalid ? <div>invalid username or password</div> : null}
            
        </div>
    )
}