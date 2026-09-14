import React, { useState } from 'react';
import { Plus, FilePenLine, Trash2 } from 'lucide-react';
import Cookies from 'js-cookie';

// shadcn/ui components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import WorkingWeekCheckbox from '../../components/ui/WorkingWeekCheckbox';

// --- Data from your images ---
const initialSuppliers = [
  { id: 'SUP-001', name: 'Global Tech Inc.', contact: 'John Doe', email: 'john@globaltech.com' },
];

const initialBuyers = [
  { id: 'BUY-001', name: 'Innovate Solutions', contact: 'Jane Smith', email: 'jane@innovate.com' },
];

const initialServiceTypes = [
  { id: 1, name: 'Raw Material' },
  { id: 2, name: 'Logistics' },
  { id: 3, name: 'Marketing Agency' },
];

// --- Main Component ---
const DataMaster = () => {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [buyers, setBuyers] = useState(initialBuyers);
  const [serviceTypes, setServiceTypes] = useState(initialServiceTypes);
  const [currentWorkingDays, setCurrentWorkingDays] = useState({});

  // --- Reusable Action Buttons ---
  const ActionButtons = ({ onEdit, onDelete }) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8 text-muted-foreground">
        <FilePenLine className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-red-500">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <Card className="m-6 shadow-lg">
      <CardContent className="pt-6">
        <Tabs defaultValue="suppliers">
          {/* --- Tab Navigation --- */}
          <TabsList>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="buyers">Buyers</TabsTrigger>
            <TabsTrigger value="service-types">Service Types</TabsTrigger>
            <TabsTrigger value="working-week">Working Week</TabsTrigger>
          </TabsList>

          {/* --- Suppliers Tab Content --- */}
          <TabsContent value="suppliers" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Suppliers</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Supplier
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>COMPANY NAME</TableHead>
                    <TableHead>CONTACT PERSON</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.contact}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>
                        <ActionButtons 
                          onEdit={() => console.log('Edit', item.id)}
                          onDelete={() => setSuppliers(suppliers.filter(s => s.id !== item.id))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* --- Buyers Tab Content --- */}
          <TabsContent value="buyers" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">All Buyers</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Buyer
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>COMPANY NAME</TableHead>
                    <TableHead>CONTACT PERSON</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buyers.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.id}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.contact}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>
                        <ActionButtons 
                          onEdit={() => console.log('Edit', item.id)}
                          onDelete={() => setBuyers(buyers.filter(b => b.id !== item.id))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* --- Service Types Tab Content --- */}
          <TabsContent value="service-types" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Service Types</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Service Type
              </Button>
            </div>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SERVICE TYPE</TableHead>
                    <TableHead className="text-right">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serviceTypes.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <ActionButtons 
                          onEdit={() => console.log('Edit', item.id)}
                          onDelete={() => setServiceTypes(serviceTypes.filter(s => s.id !== item.id))}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* --- Working Week Tab Content --- */}
          <TabsContent value="working-week" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Working Week Configuration</h3>
              <Button onClick={() => console.log("Save Working Week:", currentWorkingDays)}>
                Save Configuration
              </Button>
            </div>
            <div className="border rounded-md p-4">
              <WorkingWeekCheckbox 
                initialWorkingDays={currentWorkingDays} 
                onChange={setCurrentWorkingDays} 
              />
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Current Working Days: {JSON.stringify(currentWorkingDays)}</p>
            </div>
          </TabsContent>
          
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DataMaster;