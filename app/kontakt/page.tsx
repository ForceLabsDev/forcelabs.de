import ContactEmail from "@/components/ContactEmail";

export default function Page() {
    return (
        <>
            <div className="info-item">
                <div className="info-item__inner">
                    Wir machen neues Zeug!
                </div>
            </div>
            <div className="content-item full-item">
                <div className="content-item__inner">
                    <h2>Kontakt</h2>
                    <p>
                        <strong>E-Mail:</strong>{" "}
                        <ContactEmail />
                    </p>
                </div>
            </div>
        </>
    );
};
