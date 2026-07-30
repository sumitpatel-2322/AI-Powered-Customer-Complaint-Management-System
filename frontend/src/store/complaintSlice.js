import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

// 1. Send text messages
export const sendMessage = createAsyncThunk(
    'complaint/sendMessage',
    async (userInput, { getState, rejectWithValue }) => {
        try {
            const { complaint } = getState();
            const response = await axios.post(`${API_URL}/chat`, {
                user_input: userInput,
                conversation_id: complaint.conversationId,
            });
            return { userInput, responseData: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to communicate with the server.');
        }
    }
);

// 2. Upload Files (OCR)
export const uploadFile = createAsyncThunk(
    'complaint/uploadFile',
    async (file, { getState, rejectWithValue }) => {
        try {
            const { complaint } = getState();
            const formData = new FormData();
            formData.append('file', file);
            if (complaint.conversationId) {
                formData.append('conversation_id', complaint.conversationId);
            }

            const response = await axios.post(`${API_URL}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return { fileName: file.name, responseData: response.data };
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || 'File upload failed.');
        }
    }
);

// 3. Edit Complaint via Form
export const editComplaint = createAsyncThunk(
    'complaint/editComplaint',
    async (updates, { getState, rejectWithValue }) => {
        try {
            const { complaint } = getState();
            const response = await axios.put(`${API_URL}/edit/${complaint.conversationId}`, updates);
            return response.data; // Returns the updated ComplaintState directly
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to update complaint.');
        }
    }
);

// 4. Commit Complaint to Database
export const commitComplaint = createAsyncThunk(
    'complaint/commitComplaint',
    async (_, { getState, rejectWithValue }) => {
        try {
            const { complaint } = getState();
            const response = await axios.post(`${API_URL}/commit/${complaint.conversationId}`);
            return response.data; 
        } catch (error) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to commit complaint.');
        }
    }
);

// --- NEW GREETING CONSTANT ---
const DEFAULT_GREETING = { 
    role: 'assistant', 
    text: 'Ready to process new complaints. You can paste the raw email from the customer, or upload a PDF of the complaint report. I will extract the data and run the initial risk assessment.' 
};

const initialState = {
    conversationId: null,
    messages: [DEFAULT_GREETING], // Now loads with the greeting
    activeComplaint: null, 
    status: 'idle', 
    error: null,
};

const complaintSlice = createSlice({
    name: 'complaint',
    initialState,
    reducers: {
        resetChat: (state) => {
            state.conversationId = null;
            state.messages = [DEFAULT_GREETING]; // Resets with the greeting
            state.activeComplaint = null;
            state.status = 'idle';
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // --- Send Message ---
            .addCase(sendMessage.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.status = 'succeeded';
                if (!state.conversationId) state.conversationId = action.payload.responseData.conversation_id;
                state.messages.push({ role: 'user', text: action.payload.userInput });
                state.messages.push({ role: 'assistant', text: action.payload.responseData.message });
                state.activeComplaint = action.payload.responseData.state;
            })
            .addCase(sendMessage.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
            
            // --- Upload File ---
            .addCase(uploadFile.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(uploadFile.fulfilled, (state, action) => {
                state.status = 'succeeded';
                if (!state.conversationId) state.conversationId = action.payload.responseData.conversation_id;
                state.messages.push({ role: 'user', text: `[Uploaded Document: ${action.payload.fileName}]` });
                state.messages.push({ role: 'assistant', text: action.payload.responseData.message });
                state.activeComplaint = action.payload.responseData.state;
            })
            .addCase(uploadFile.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })

            // --- Edit Complaint ---
            .addCase(editComplaint.fulfilled, (state, action) => {
                state.activeComplaint = action.payload;
            })

            // --- Commit Complaint ---
            .addCase(commitComplaint.pending, (state) => { state.status = 'loading'; state.error = null; })
            .addCase(commitComplaint.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.messages.push({ role: 'assistant', text: action.payload.message });
                state.activeComplaint = action.payload.state;
            })
            .addCase(commitComplaint.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; });
    }
});

export const { resetChat } = complaintSlice.actions;
export default complaintSlice.reducer;