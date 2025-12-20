import React, { useState, useEffect } from 'react';
import { Rocket, Server, Code, Zap, CheckCircle, Moon, Sun } from 'lucide-react';
import styles from "./Home.module.css"
import Header from "../../Components/Header/Header"
import useSite from '../../Context/SiteContext';
import ImageSpinner from '../../Components/ImageSpinner/ImageSpinner';

const App = () => {

    const imgSrc = "https://upload.wikimedia.org/wikipedia/commons/8/8c/Cristiano_Ronaldo_2018.jpg";




    return (
        <div className={styles.homeContainer}>
            <Header />
            <main className={styles.mainContainer}>

                <h1>DRT</h1>
                <div className={styles.img}>

                    <ImageSpinner src={imgSrc} alt={"Ronaldo Image"} />
                </div>
            </main>
        </div>
    );
};

export default App;