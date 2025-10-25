import React from 'react';
import styled from 'styled-components';
import Slider from 'react-slick';
import { Map, Marker } from "pigeon-maps";

// Import css for react-slick
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Styled Components
const PageWrapper = styled.div`
  background-color: #FBF8F3; // Sand
  color: #4A4A4A;
  font-family: 'Lucida Grande', 'Lucida Sans Unicode', Geneva, Verdana, sans-serif;
  scroll-behavior: smooth; /* Smooth scrolling for nav links */

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const Nav = styled.header` /* Changed to header for semantic clarity */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: rgba(251, 248, 243, 0.8);
  position: sticky;
  top: 0;
  z-index: 10;

  a {
    margin-left: 1.5rem;
    color: #8B4513; /* Ember */
    text-decoration: none;
    font-weight: bold;
    position: relative;
    padding-bottom: 0.25rem;

    &:hover {
      color: #A0522D;
    }

    &::after {
      content: '';
      position: absolute;
      width: 0;
      height: 2px;
      bottom: 0;
      left: 0;
      background-color: #A0522D;
      transition: width 0.3s ease-out;
    }

    &:hover::after {
      width: 100%;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    padding: 1rem;

    a {
      margin: 0.5rem 0;
    }
  }
`;

const Logo = styled.h1`
  font-family: 'Playfair Display', serif;
  color: #8B4513; // Ember
  font-size: 1.8rem; /* Slightly larger */

  @media (max-width: 768px) {
    margin-bottom: 1rem;
  }
`;

const HeroSection = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  background: linear-gradient(rgba(80, 60, 40, 0.5), rgba(20, 15, 10, 0.6)), /* Warmer gradient */
              url('https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?q=80&w=2070&auto=format&fit=crop') no-repeat center center/cover;
  color: #FFFFFF;
  padding: 2rem;
`;

const Headline = styled.h1`
  font-family: 'Playfair Display', serif;
  font-size: 3.5rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtext = styled.p`
  font-size: 1.25rem;
  max-width: 600px;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 1rem;
    max-width: 90%;
  }
`;

const CTAButton = styled.a`
  background-color: #8B4513; // Ember
  color: #FFFFFF;
  padding: 1rem 2rem;
  text-decoration: none;
  border-radius: 5px;
  margin: 0.5rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease; /* Added transitions */
  box-shadow: 0 4px 10px rgba(139, 69, 19, 0.3); /* Glow/shadow */

  &:hover {
    background-color: #A0522D;
    transform: translateY(-2px); /* Lift effect */
    box-shadow: 0 6px 15px rgba(139, 69, 19, 0.4);
  }
`;

const SecondaryButton = styled(CTAButton)`
  background-color: transparent;
  border: 2px solid #FFFFFF;
  box-shadow: none; /* Remove shadow for secondary */

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    transform: translateY(-2px);
    box-shadow: none;
  }
`;

const Section = styled.section`
  padding: 4rem 2rem;
  text-align: center;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const SectionAlt = styled(Section)`
  background-color: #F3EDE3; /* Slightly darker sand tone */
`;

const SectionTitle = styled.h2`
  font-family: 'Playfair Display', serif;
  font-size: 2.5rem;
  color: #8B4513; // Ember
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const HowItWorksGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  max-width: 900px;
  margin: 0 auto;
`;

const Step = styled.div`
  text-align: center;

  svg {
    width: 50px;
    height: 50px;
    margin-bottom: 1rem;
    color: #8B4513; // Ember
  }
`;

const MapPreview = styled.div`
  height: 400px;
  max-width: 800px;
  margin: 2rem auto;
  border-radius: 10px;
  overflow: hidden;
  border: 5px solid #D2B48C; // Sand
`;

const TestimonialSlider = styled(Slider)`
  background-color: #F3EDE3; /* Subtle background for warmth */
  padding-bottom: 2rem; /* Center dots visually */

  .slick-slide {
    padding: 1rem;
  }

  .slick-dots {
    bottom: 10px;
  }

  .slick-dots li button:before {
    color: #8B4513; // Ember
  }
`;

const TestimonialCard = styled.div`
  background-color: #FFFFFF;
  border-radius: 10px;
  padding: 2rem;
  margin: 0 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  p {
    font-style: italic;
  }
`;

const CallToActionSection = styled(Section)`
  background-color: #A2A182; // Sage
  color: #FFFFFF;
  /* Ensure good contrast for text on sage background */
  p {
    color: #FFFFFF;
  }
`;

const SignUpForm = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  max-width: 500px;
  margin: 0 auto;
`;

const Input = styled.input`
  width: 100%;
  padding: 1rem;
  border-radius: 5px;
  border: none;
`;

const ToggleWrapper = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;

  label {
    color: #FFFFFF; /* Ensure text is visible */
  }
`;

const Footer = styled.footer` /* Changed to footer for semantic clarity */
  background-color: #4A4A4A;
  color: #FFFFFF;
  padding: 2rem;
  text-align: center;

  a {
    color: #FFFFFF;
    text-decoration: none;
    margin: 0 1rem;
  }
`;

const LandingPage = ({ setShowAuthModal }) => {
    const testimonials = [
        {
            quote: "I met my best friends on the road through WildChurch.",
            author: "A Happy Vanlifer"
        },
        {
            quote: "It felt like finding family in the middle of nowhere.",
            author: "Solo Traveler"
        },
        {
            quote: "We sang around the fire until sunrise — Jesus showed up.",
            author: "A Gatherer"
        }
    ];

    const sliderSettings = {
        dots: true,
        infinite: true,
        speed: 500,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
    };

    return (
        <PageWrapper>
            <Nav>
                <Logo>WildChurch</Logo>
                <div>
                    <a href="/app">Go to Map App</a> {/* Direct link to main app map */}
                </div>
            </Nav>
            <main> {/* Wrapped main content in <main> tag */}
                <HeroSection>
                    <Headline>Wherever you roam, find the Church beneath the open sky.</Headline> {/* Refined headline */}
                    <Subtext>Find Spirit-led gatherings, prayer nights, and fellowship wherever your path leads.</Subtext> {/* Refined subtext */}
                    <div>
                        <CTAButton href="#map">Explore the Map</CTAButton> {/* Updated CTA text */}
                        <SecondaryButton as="button" onClick={() => setShowAuthModal(true)}>Join the Movement</SecondaryButton> {/* Opens AuthModal */}
                    </div>
                </HeroSection>

                <Section>
                    <SectionTitle>How It Works</SectionTitle>
                    <HowItWorksGrid>
                        <Step>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <h3>Drop a Pin</h3>
                            <p>Mark your location or gathering.</p>
                        </Step>
                        <Step>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <h3>Find Others</h3>
                            <p>Explore Spirit-led events near you.</p>
                        </Step>
                        <Step>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 3 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <h3>Gather & Share</h3>
                            <p>Pray, eat, worship, rest together.</p>
                        </Step>
                    </HowItWorksGrid>
                    <p style={{ marginTop: '2rem' }}>A living map of the Church without walls.</p>
                </Section>

                <SectionAlt> {/* Added Vision Section */}
                    <SectionTitle>Our Heart</SectionTitle>
                    <p style={{ maxWidth: '700px', margin: '0 auto' }}>
                        We believe the Church was never meant to be confined to walls.
                        WildChurch connects believers, travelers, and seekers to pray,
                        worship, and share meals together under open skies — a family in motion, led by the Holy Spirit.
                    </p>
                </SectionAlt>

                <Section id="map">
                    <SectionTitle>Featured Map</SectionTitle>
                    <p style={{ maxWidth: '700px', margin: '0 auto 2rem auto' }}>
                        Explore example gatherings — from prayer hikes to campfire worship. This is a beta example, not live data.
                    </p> {/* Intro sentence */}
                    <MapPreview>
                        <Map height={400} defaultCenter={[37.8651, -119.5383]} defaultZoom={7}>
                            <Marker width={50} anchor={[37.8651, -119.5383]}>
                                <span role="img" aria-label="dove">🕊️ Sunset Worship, Yosemite Valley</span>
                            </Marker>
                            <Marker width={50} anchor={[34.8697, -111.7610]}>
                                 <span role="img" aria-label="fire">🔥 Campfire Prayer Circle, Sedona</span>
                            </Marker>
                            <Marker width={50} anchor={[41.4102, -122.3114]}>
                               <span role="img" aria-label="bread">🍞 Shared Meal, Mount Shasta</span>
                            </Marker>
                        </Map>
                    </MapPreview>
                    <CTAButton href="/app">View Full Map</CTAButton> {/* View full map button */}
                </Section>

                <SectionAlt> {/* Alternating background */}
                    <SectionTitle>Community Stories</SectionTitle>
                    <TestimonialSlider {...sliderSettings}>
                        {testimonials.map((testimonial, index) => (
                            <div key={index}>
                                <TestimonialCard>
                                    <p>"{testimonial.quote}"</p>
                                    <p><strong>- {testimonial.author}</strong></p>
                                </TestimonialCard>
                            </div>
                        ))}
                    </TestimonialSlider>
                </SectionAlt>

                <CallToActionSection id="signup">
                    <SectionTitle style={{ color: '#FFFFFF' }}>Be part of the movement.</SectionTitle>
                    <p>Add your name, van, tent, or town to the map.</p>
                    <SignUpForm>
                        {/* <Input type="email" placeholder="Enter your email" /> */}
                        {/* <ToggleWrapper>
                            <label>
                                <input type="checkbox" /> I'm open to host
                            </label>
                            <label>
                                <input type="checkbox" /> I'm looking for fellowship
                            </label>
                        </ToggleWrapper> */}
                        <CTAButton as="button" onClick={() => setShowAuthModal(true)} style={{ backgroundColor: '#FFFFFF', color: '#4A4A4A' }}>Join the Movement</CTAButton> {/* Opens AuthModal */}
                    </SignUpForm>
                </CallToActionSection>
            </main> {/* Closed <main> tag */}

            <Footer>
                <a href="#about">About</a>
                <a href="#vision">Vision / Statement of Faith</a>
                <a href="#guidelines">Safety & Community Guidelines</a>
                <a href="#contact">Contact / Socials</a>
            </Footer>
        </PageWrapper>
    );
};

export default LandingPage;
