"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";


const HeroSection = () => {
    const imageRef = useRef();

  useEffect(() => {
    const imageElement = imageRef.current;
    const handleScroll=() => {
        const scrollPosition = window.scrollY;
        const scrollThreshold = 80; 
        if(scrollPosition > scrollThreshold){
            imageElement.classList.add('scrolled');
        } else {
            imageElement.classList.remove('scrolled');
        }
     
    };
    window.addEventListener('scroll', handleScroll);


    return ()=>{
        window.removeEventListener('scroll', handleScroll)
    };  
},[]);
  return(
     <div className="pb-20 px-4 ">
    <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-4xl lg:text-[100px] pb-3 gradient-title">
           AI-driven insights <br /> for smarter investments.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Alvestor is an AI-powered investment platform that simplifies finance through intelligent automation. Our mission is to make investing accessible, efficient, and personalized for everyone.
        </p>
        <div className="flex justify-center space-x-4">
            <Link href="/dashboard">
            <Button size="lg" className="px-8">
            Get Started
            </Button>
            </Link>
             <Link href="https://www.youtube.com">
            <Button size="lg" variant='outline' className="px-8">
         Watch Demo
            </Button>
            </Link>
        </div>
        <div>
            <div className="hero-image-wrapper">
                <div ref={imageRef} className="hero-image">
               < Image src="/banner.png"
                 width={1280} 
                 height={720}
                 alt="Dashboard Preview"
                 className="rounded-lg shadow-2x1 border mx-auto"
                 priority
                 />
                 </div>
            </div>
        </div>
    </div>
    </div>
  );
};

export default HeroSection;
