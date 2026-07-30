import React from 'react';
import CopilotChat from './components/CopilotChat';
import ComplaintForm from './components/ComplaintForm';

const App = () => {
    return (
        <>
            <style>{`
                *{
                    box-sizing:border-box;
                }

                body{
                    margin:0;
                    background:#edf2f7;
                    font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
                    overflow:hidden;
                }

                #root{
                    height:100vh;
                    width:100vw;
                }

                .app-shell{
                    height:100%;
                    width:100%;
                    display:flex;
                    padding:18px;
                    gap:18px;
                    background:
                        radial-gradient(circle at top left,#ffffff,#eef3f9 40%,#e7edf5 100%);
                }

                .chat-panel{
                    width:430px;
                    min-width:430px;
                    max-width:430px;

                    display:flex;
                    flex-direction:column;

                    background:white;

                    border-radius:22px;

                    overflow:hidden;

                    border:1px solid #e7ebf2;

                    box-shadow:
                        0 10px 35px rgba(15,23,42,.08),
                        0 2px 8px rgba(15,23,42,.05);
                }

                .form-panel{
                    flex:1;

                    display:flex;
                    flex-direction:column;

                    background:white;

                    border-radius:22px;

                    overflow:hidden;

                    border:1px solid #e7ebf2;

                    box-shadow:
                        0 10px 35px rgba(15,23,42,.08),
                        0 2px 8px rgba(15,23,42,.05);
                }

                @media(max-width:1200px){

                    .app-shell{
                        flex-direction:column;
                        overflow:hidden;
                    }

                    .chat-panel{
                        width:100%;
                        min-width:100%;
                        max-width:100%;
                        height:42%;
                    }

                    .form-panel{
                        height:58%;
                    }
                }

            `}</style>

            <div className="app-shell">

                <div className="chat-panel">
                    <CopilotChat />
                </div>

                <div className="form-panel">
                    <ComplaintForm />
                </div>

            </div>
        </>
    );
};

export default App;