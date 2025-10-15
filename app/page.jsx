import HeroSection from "@/components/hero";
import { Button } from "@/components/ui/button";
import {Card , CardContent} from "@/components/ui/card"
import { featuresData, howItWorksData, statsData ,testimonialsData } from "@/data/landing";
import Image from "next/image"
import Link from "next/link";


export default function Home() {
  return(
  <div className="mt-40">
    <HeroSection />
      <section className="py-20 bg-blue-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {statsData.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
      

      <section className="py-20">
        <div className="conatainer mx-auto px-4">
          <h1 className="text 3xl, font-bold text-center mb-12 ">
            Everything you need to manage your finances</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuresData.map((feature,index)=>(
            <Card key={index} className=" p-6">
  
  <CardContent className="text-center space-y-4">
  {feature.icon}
  <h3 className="text xl font-bold">{feature.title}</h3>
  <p className="text-gray-600">{feature.description}</p>

  </CardContent>
  
</Card>
          ))}
            </div>
        </div>
        </section>
 

          <section className="py-20 bg-blue-50">
        <div className="conatainer mx-auto px-4">
          <h2 className="text 3xl, font-extrabold text-center mb-12 ">How it Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {howItWorksData.map((step,index)=>(
            <div key={index} className="text-center ">
<div className="h-16 w-16 rounded-full bg-blue-100 justify-center flex items-center mx-auto mb-6 ">{step.icon}</div>
<h3 className="font-semibold,text-xl">{step.title}</h3>
<p className="text-gray-600">{step.description}</p>
  
</div>
          ))}
            </div>
        </div>
        </section>

<section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text 3xl, font-bold text-center mb-12 ">
            What Our Users Say
            </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonialsData.map((testimonial,index)=>(
            <Card key={index} className=" p-6">
  
  <CardContent className="text-center space-y-4">
<div className="flex items-center mb-4">
<Image
 src={testimonial.image}
alt={testimonial.name}
width={40}
height={40}
className="rounded-full"

/>
<div className="ml-4">
  <div className ="font-semibold">{testimonial.name}</div>
  <div className="text-sm text-grey-600">{testimonial.role}</div>
</div>
</div>
<p
className ="text-gray-600">{testimonial.quote}
</p>
  </CardContent>
  
</Card>
          ))}
            </div>
        </div>
        </section>
        
<section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4 text-center text-white">
          <h2 className="text 3xl font-bold text-center mb-4 ">
            Ready to take control of your finances?
            </h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto ">
          Join Alvestor today and start your journey towards financial freedom!
            </p>
            <Link href="/dashboard">
            <Button sixe="lg"
            className="bg-white text-blue-600 hover: bg-blue-50 animate-bounce">
      Start your Free Trail
            </Button>
            </Link>
        </div>
        </section>
      </div>
  );
}