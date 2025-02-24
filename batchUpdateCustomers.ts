// batchUpdateCustomers.ts
const { adminFirestore } = require("./firebaseAdmin");

async function batchUpdateCustomers() {
  try {
    const customersRef = adminFirestore.collection("customers");
    const snapshot = await customersRef.get();

    if (snapshot.empty) {
      console.log("No customer documents found.");
      return;
    }

    const batch = adminFirestore.batch();

    snapshot.forEach((doc: any) => {
      const data = doc.data();
      const lastCallDate = data.lastCallDate || "";
      // Set missedCall: true if lastCallDate equals "00/00/0000", otherwise false.
      const missedCall = lastCallDate === "00/00/0000";
      batch.update(doc.ref, { missedCall });
    });

    await batch.commit();
    console.log("Batch update completed successfully.");
  } catch (error) {
    console.error("Error updating customer documents:", error);
  }
}

batchUpdateCustomers();
