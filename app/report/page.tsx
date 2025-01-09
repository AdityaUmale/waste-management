'use client'

import { useState, useCallback, useEffect } from "react";
import { MapPin, Upload, CheckCircle, Loader } from "lucide-react";
import { Button } from '@/components/ui/button';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {StandaloneSearchBox, useJsApiLoader} from '@react-google-maps/api'
import { Libraries } from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import { Toast } from "react-hot-toast";

const gemeniApiKey = process.env.GEMINI_API_KEY 
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY as any

const libraries: Libraries = ['places'];

export default function ReportPage() {
    const [ user, setUser ] = useState(' ')
    const router = useRouter();

    const [reports, setReports] = useState<Array<{
        id: number;
        location: string;
        wasteType: string;
        amount: string;
        createdAt: string;
    }>>([]);

    const [newReport, setNewReport] = useState({
        location: "",
        type: "",
        amount: "",
})
const [ file, setFile ] = useState<File | null>(null);
const [ preview, setPreview] = useState<string | null>(null);

 const [ verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failure'>("idle");

 const [verificationResult, setVerificationResult] = useState<{
    wasteType: string;
    quantity: string;
    confidence: Number;
 } | null>(null);

 const [isSubmitting, setIsSubmitting] = useState(false);

 const [searchBox, setSearchBox] = useState<google.maps.places.SearchBox | null>(null);

 const {isLoaded} = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
    libraries: libraries,
 });

 const onLoad = useCallback((ref: google.maps.places.SearchBox) => {
    setSearchBox(ref);
},[]);

const onPlaceChanged = () => {
    if(searchBox) {
        const places = searchBox.getPlaces();
        if(places && places.length > 0) {
            const place = places[0];
            setNewReport(prev => ({
                ...prev,
                location: place.formatted_address || "",
            }));
    }
}
};

const handleInputChange = (e:React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const {name, value} = e.target 
    setNewReport({...newReport, [name]: value});
};

const handleFlieChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(e.target.files && e.target.files[0]) {
        const selectedFile = e.target.files[0]
        setFile(selectedFile);

        const reader = new FileReader();
        reader.onload = (e) => {
            setPreview(e.target?.result as string);
        }
        reader.readAsDataURL(selectedFile);
    }
};



}