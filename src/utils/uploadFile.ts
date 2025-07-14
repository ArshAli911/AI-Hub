import { storage } from '../services/firebase';
import { Platform } from 'react-native';
import firebase from 'firebase/app';
import 'firebase/storage'; // Import for side effects to extend firebase namespace

export const uploadFile = async (fileUri: string, fileName: string, fileType: string): Promise<string> => {
  try {
    console.log(`Uploading file: ${fileName} (${fileType}) from URI: ${fileUri}`);

    const response = await fetch(fileUri);
    const blob = await response.blob();

    const storageRef = storage.ref();
    const fileRef = storageRef.child(`uploads/${Date.now()}_${fileName}`);

    const uploadTask = fileRef.put(blob);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: firebase.storage.UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
          // You can add a progress callback here if needed for UI updates
        },
        (error: firebase.FirebaseError) => {
          console.error('File upload error:', error);
          reject(error);
        },
        async () => {
          const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
          console.log('File uploaded successfully. Download URL:', downloadURL);
          resolve(downloadURL);
        }
      );
    });
  } catch (error) {
    console.error('Error in uploadFile utility:', error);
    throw error;
  }
}; 