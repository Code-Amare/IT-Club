import { createContext, useContext, useState, useEffect } from 'react'
import api from "../Utils/api"
import { useNavigate } from 'react-router-dom'

const UserContext = createContext()

export function UserProvider({ children }) {
    const navigate = useNavigate()
    const [user, setUser] = useState({
        isAuthenticated: null,
        role: null,
        email: null,
        emailVerified: null,
        twoFaEnabled: null,
        hasPassword: null,
        dateJoined: null,
        fullName: null,
    })

    // Exposed getUser function
    const getUser = async () => {
        try {
            const res = await api.get("/api/users/get")
            if (res.status === 200 && res.data) {
                const user = res.data.user
                setUser({
                    isAuthenticated: true,
                    role: user.role,
                    email: user.email,
                    emailVerified: user.email_verified,
                    twoFaEnabled: user.twofa_enabled,
                    hasPassword: user.has_password,
                    dateJoined: user.date_joined,
                    fullName: user.full_name,
                })
            }
        } catch (error) {
            console.log(error)
            setUser(prev => ({ ...prev, isAuthenticated: false }))
        }
    }

    // Fetch user once on mount (keeps existing behavior)
    useEffect(() => {
        getUser()
    }, [])

    const login = (userData) => {
        setUser({ isAuthenticated: true, ...userData })
    }

    const logout = () => {
        try {
            api.post("api/users/logout/")
            navigate("login/")
        } catch (err) {
            console.log(err)
        }
        setUser({
            isAuthenticated: null,
            role: null,
            email: null,
            emailVerified: null,
            twoFaEnabled: null,
            hasPassword: null,
            dateJoined: null,
            fullName: null,
        })
    }

    return (
        <UserContext.Provider value={{ user, login, logout, getUser }}>
            {children}
        </UserContext.Provider>
    )
}

export function useUser() {
    return useContext(UserContext)
}
