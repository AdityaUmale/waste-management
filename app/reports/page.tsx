'use client'

import { useState, useCallback, useEffect } from "react";
import { MapPin, Upload, CheckCircle, Loader } from "lucide-react";
import { Button } from '../../components/ui/button';
import { GoogleGenerativeAI } from "@google/generative-ai";
import {StandaloneSearchBox, useJsApiLoader} from '@react-google-maps/api'
import { Libraries } from "@react-google-maps/api";
import { useRouter } from "next/navigation";
import toast, { Toast } from "react-hot-toast";
import { createReport, getRecentReports, getUserByEmail } from "../../utils/db/actions";
import '../globals.css';

const gemeniApiKey = process.env.GEMINI_API_KEY as any
const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY as any

const libraries: Libraries = ['places'];

export default function ReportPage() {
    const [ user, setUser ] = useState(' ') as any;
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

const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file)
    })

}
const handleVerify = async () => {
    if(!file) return;

    setVerificationStatus('verifying');

    try {
        const genAI = new GoogleGenerativeAI(gemeniApiKey);
        const model = genAI.getGenerativeModel({model:'gemini-1.5-flash'});
        const base64Data = await readFileAsBase64(file);
        const imageParts = [
            {
                inlineData: {
                    data: base64Data.split(',')[1],
                    mimeType: file.type,
                }
            }
        ];
        const prompt = `you are an expert in waste management and recycling. Analyze this image and provide:
        1. The type of waste (e.g. plastic, paper, glass, metal, organic)
        2. An estimate of the quantity or amount (in kg or liters)
        3. Your confidence level in this assessment (as a percentage)

        Respond in JSON format like this:
        {
            "wasteType": "type of waste",
            "quantity": "estimated quantity with unit",
            "confidence": confidence level as a number between 0 and 1
        }`;

        const result = await model.generateContent([prompt, ...imageParts])
        const response = await result.response;
        const text = response.text();

        try {
            const parseedResult = JSON.parse(text);
            if(parseedResult.wasteType && parseedResult.quantity && parseedResult.confidence) {
                setVerificationResult(parseedResult);
                setVerificationStatus('success');
                setNewReport({
                    ...newReport,
                    type: parseedResult.wasteType,
                    amount: parseedResult.quantity,
                })
            } else {
                console.error('Invalid verification results', parseedResult);
                setVerificationStatus("failure");
            }
        } catch (e) {   
            console.log("Failed to parse JSON respponses", e);
            setVerificationStatus("failure");
        }
    } catch(e) {
        console.log("error verifying waste", e);
        setVerificationStatus("failure");
 }
};

const handleSubmit = async(e:React.FormEvent) => {
    e.preventDefault();
    if(verificationStatus !== 'success' || !user) {
        toast.error("Please verify the waste before submitting"); 
    }

    setIsSubmitting(true);

    try {
        const report = await createReport(user.id , newReport.location, newReport.type, newReport.amount, preview || undefined, verificationResult ? JSON.stringify(verificationResult) : undefined) as any;
        const formattedReport = {
            id : report.id,
            location: report.location,
            wasteType: report.wasteType,
            amount: report.amount,
            createdAt: report.createdAt.toString().split("T")[0],
        };
        setReports([formattedReport, ...reports]);
        setNewReport({location:'', type:'', amount:''});
        setFile(null);
        setPreview(null);
        setVerificationResult(null);
        setVerificationStatus("idle");

        toast.success(`report submitted successfully! you've earned points for reporting waste`);
    }catch(e) {
        console.error('error submitting report', e);
        toast.error('failed to submit report please try again');
    } finally {
        setIsSubmitting(false);
    }
};

useEffect(() => {
    const checkUser = async () => {
        const email = localStorage.getItem("userEmail");
        if(email){
            let user = await getUserByEmail(email);
            setUser(user);

            const recentReports = getRecentReports() as any;
            const formattedReports = recentReports?.map((report: any)=> ({
                ...report,
                createdAt: report.createdAt.toISOSting().split('T')[0]
            }));
            setReports(formattedReports);
        } else {
            router.push("/");
        }
    }
    checkUser();
},[router]);

return (
    <div className="p-8 max-w--4xl mx-auto">
        <h1 className="text-3xl font-semibold mb-6 text-gray-800">
            Report Waste
        </h1>

    </div>
)

}