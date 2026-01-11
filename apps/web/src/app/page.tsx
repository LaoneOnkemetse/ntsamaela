export default function Home() {
  return (
    <main>
      {/* Hero Section */}
      <section style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #75AADB 0%, #5A8FBF 100%)',
        color: 'white'
      }}>
        <h1 style={{
          fontSize: '3rem',
          fontWeight: '700',
          marginBottom: '1rem',
          lineHeight: '1.2'
        }}>
          Peer-to-Peer<br />
          Package Delivery
        </h1>
        <p style={{
          fontSize: '1.25rem',
          marginBottom: '2rem',
          maxWidth: '600px',
          opacity: 0.95
        }}>
          &quot;Re go tsamaela bosigo le motshegare&quot;
        </p>
        <p style={{
          fontSize: '1.1rem',
          marginBottom: '3rem',
          maxWidth: '700px',
          lineHeight: '1.6'
        }}>
          Connecting drivers with spare vehicle capacity to customers needing inter-city parcel delivery. 
          Fast, secure, and affordable delivery across Botswana.
        </p>
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          <a
            href="#download"
            style={{
              padding: '1rem 2rem',
              backgroundColor: 'white',
              color: '#75AADB',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '1.1rem',
              transition: 'transform 0.2s'
            }}
          >
            Download App
          </a>
          <a
            href="#how-it-works"
            style={{
              padding: '1rem 2rem',
              backgroundColor: 'transparent',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              fontSize: '1.1rem',
              border: '2px solid white',
              transition: 'transform 0.2s'
            }}
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{
        padding: '4rem 2rem',
        backgroundColor: '#F9FAFB'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: '#111827'
          }}>
            Why Choose Ntsamaela?
          </h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.1rem',
            color: '#6B7280',
            marginBottom: '3rem'
          }}>
            Experience the future of package delivery with our innovative platform
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {[
              { icon: '🔐', title: 'Hybrid Verification', desc: 'AI-powered document validation with facial recognition ensures secure and trustworthy deliveries.' },
              { icon: '📍', title: 'Real-Time Tracking', desc: 'Track your package in real-time with live location updates and delivery status notifications.' },
              { icon: '💰', title: 'Competitive Pricing', desc: 'Bid-based system ensures you get the best price for your delivery needs.' },
              { icon: '🚗', title: 'Driver Network', desc: 'Connect with verified drivers with spare vehicle capacity across Botswana.' },
              { icon: '💳', title: 'Secure Payments', desc: 'Integrated wallet system with secure payment processing for seamless transactions.' },
              { icon: '⚡', title: 'Fast Delivery', desc: 'Quick and efficient delivery service connecting cities across Botswana.' }
            ].map((feature, idx) => (
              <div key={idx} style={{
                padding: '2rem',
                backgroundColor: 'white',
                borderRadius: '1rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  marginBottom: '1rem',
                  color: '#111827'
                }}>{feature.title}</h3>
                <p style={{
                  color: '#6B7280',
                  lineHeight: '1.6'
                }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" style={{
        padding: '4rem 2rem',
        backgroundColor: 'white'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <h2 style={{
            textAlign: 'center',
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: '#111827'
          }}>
            How It Works
          </h2>
          <p style={{
            textAlign: 'center',
            fontSize: '1.1rem',
            color: '#6B7280',
            marginBottom: '3rem'
          }}>
            Get started in three simple steps
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
            marginBottom: '4rem'
          }}>
            {[
              { num: '1', title: 'Create Package', desc: 'Register as a customer, create a package request with pickup and delivery locations.' },
              { num: '2', title: 'Receive Bids', desc: 'Verified drivers in your area will place bids. Choose the best offer for your needs.' },
              { num: '3', title: 'Track & Deliver', desc: 'Track your package in real-time and receive notifications when it\'s delivered.' }
            ].map((step, idx) => (
              <div key={idx} style={{
                textAlign: 'center'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#75AADB',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  margin: '0 auto 1rem'
                }}>{step.num}</div>
                <h3 style={{
                  fontSize: '1.5rem',
                  marginBottom: '1rem',
                  color: '#111827'
                }}>{step.title}</h3>
                <p style={{
                  color: '#6B7280',
                  lineHeight: '1.6'
                }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" style={{
        padding: '4rem 2rem',
        backgroundColor: '#1F2937',
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h2 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem'
          }}>
            Download Ntsamaela App
          </h2>
          <p style={{
            fontSize: '1.1rem',
            marginBottom: '2rem',
            opacity: 0.9
          }}>
            Available on iOS and Android. Start delivering or sending packages today!
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <a
              href="#"
              style={{
                padding: '1rem 2rem',
                backgroundColor: 'white',
                color: '#1F2937',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600'
              }}
            >
              App Store
            </a>
            <a
              href="#"
              style={{
                padding: '1rem 2rem',
                backgroundColor: 'white',
                color: '#1F2937',
                textDecoration: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600'
              }}
            >
              Google Play
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '2rem',
        backgroundColor: '#111827',
        color: 'white',
        textAlign: 'center'
      }}>
        <p>&copy; 2025 Ntsamaela. All rights reserved.</p>
        <p style={{
          marginTop: '0.5rem',
          fontSize: '0.9rem',
          opacity: 0.8
        }}>
          Peer-to-peer package delivery platform connecting drivers and customers across Botswana.
        </p>
      </footer>
    </main>
  );
}
