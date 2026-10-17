"use client"
import { useSession, signOut } from "next-auth/react"

export default function Page() {
    const { data: session } = useSession()
    return (
        <div className="">
            <h1>Welcome, {session?.user?.name}!</h1>
            <p>Email: {session?.user?.email}</p>
            {
                session?.user?.name && (
                    <button onClick={() => signOut()} className="">
                        Log Out
                    </button>
                )
            }

        </div>
    )
}