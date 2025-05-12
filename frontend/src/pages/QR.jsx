import { useState } from 'react';
import { QrReader } from 'react-qr-reader';

function QRScanner() {
    const [scanResult, setScanResult] = useState('');
    const [error, setError] = useState(null);

    return (
        <div>
            <h1>Live QR Scanner</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            
            <div style={{ width: '100%', maxWidth: '400px', height: 'auto' }}>
                <QrReader
                    constraints={{ facingMode: 'environment' }}
                    onResult={(result, err) => {
                        if (result?.text) {
                            setScanResult(result.text);
                            localStorage.setItem('table_id', result.text); // Optional
                        } else if (err) {
                            setError('Error accessing camera or reading QR code');
                            console.error(err);
                        }
                    }}
                    videoContainerStyle={{
                        paddingTop: '100%' // Makes video square
                    }}
                    videoStyle={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                    scanDelay={300}
                />
            </div>

            <h2>Scanned QR Code:</h2>
            <p>{scanResult || 'No QR code scanned yet.'}</p>
        </div>
    );
}

export default QRScanner;
